"""Fine-tune MobileNetV3-small on ml/dataset/{train,val}/<label>/ and export ml/model/knit.onnx + labels.json.

    pip install -r ml/requirements.txt
    python ml/train.py [--epochs 15] [--batch 32]

Uses the GPU when torch finds one. ponytail: plain fine-tuning with class weights; add more photos before tuning anything else.
"""
import argparse
import json
from pathlib import Path

import torch
from torch import nn
from torchvision import datasets, models, transforms

HERE = Path(__file__).parent
SIZE = 224
MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]


def loaders(batch: int, workers: int):
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(SIZE, scale=(0.6, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(0.3, 0.3, 0.3),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])
    val_tf = transforms.Compose([transforms.Resize(256), transforms.CenterCrop(SIZE), transforms.ToTensor(), transforms.Normalize(MEAN, STD)])
    train = datasets.ImageFolder(HERE / "dataset" / "train", train_tf)
    val = datasets.ImageFolder(HERE / "dataset" / "val", val_tf)
    if train.classes != val.classes:
        raise SystemExit(f"train and val have different labels: {train.classes} vs {val.classes}")
    return (
        train,
        torch.utils.data.DataLoader(train, batch, shuffle=True, num_workers=workers),
        torch.utils.data.DataLoader(val, batch, num_workers=workers),
    )


def evaluate(model, loader, device, n_classes):
    model.eval()
    right, total = torch.zeros(n_classes), torch.zeros(n_classes)
    with torch.no_grad():
        for x, y in loader:
            pred = model(x.to(device)).argmax(1).cpu()
            for t, p in zip(y, pred):
                total[t] += 1
                right[t] += int(t == p)
    return right, total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=15)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--workers", type=int, default=0)  # 0 is safest on Windows
    ap.add_argument("--no-pretrained", action="store_true", help="skip downloading ImageNet weights (smoke tests)")
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", device)
    train, train_loader, val_loader = loaders(args.batch, args.workers)
    classes = train.classes
    n = len(classes)

    model = models.mobilenet_v3_small(weights=None if args.no_pretrained else models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, n)
    model.to(device)

    counts = torch.bincount(torch.tensor(train.targets), minlength=n).float()
    loss_fn = nn.CrossEntropyLoss(weight=(counts.sum() / (n * counts)).to(device))  # rare classes count more
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)

    out = HERE / "model"
    out.mkdir(exist_ok=True)
    best = -1.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        for x, y in train_loader:
            opt.zero_grad()
            loss_fn(model(x.to(device)), y.to(device)).backward()
            opt.step()
        right, total = evaluate(model, val_loader, device, n)
        acc = (right.sum() / total.sum()).item()
        print(f"epoch {epoch:2}  val accuracy {acc:.3f}")
        if acc > best:
            best = acc
            torch.save(model.state_dict(), out / "knit.pt")
            best_per_class = {c: f"{int(r)}/{int(t)}" for c, r, t in zip(classes, right, total)}

    print("best val accuracy:", round(best, 3), best_per_class)
    model.load_state_dict(torch.load(out / "knit.pt", map_location=device))
    model.eval()
    dummy = torch.zeros(1, 3, SIZE, SIZE, device=device)
    torch.onnx.export(model, dummy, out / "knit.onnx", input_names=["image"], output_names=["scores"], dynamo=False)
    (out / "labels.json").write_text(json.dumps({"labels": classes, "size": SIZE, "mean": MEAN, "std": STD}, indent=2), encoding="utf-8")
    print("wrote", out / "knit.onnx")


if __name__ == "__main__":
    main()
