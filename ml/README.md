# Dataset tools

Collect freely licensed photos for the on-device classifier. Python 3, standard library only.

1. `python ml/commons.py` downloads photos from Wikimedia Commons (CC0, public domain, CC BY, CC BY-SA only) into `ml/raw/<label>/` and records source, license and author in `ml/manifest.csv`. Categories live in `ml/categories.json`; the names are unverified guesses, the script prints categories that returned nothing.
2. Add more photos by hand: copy them under `ml/raw/<label>/` and add a row to `ml/manifest.csv` with their source and license.
3. `python ml/split.py` writes `ml/dataset/train` and `ml/dataset/val` and warns about labels with fewer than 100 training images.

Keep the license of every photo: if the app is ever published, photos from a source that does not allow it can be dropped and the model retrained.

# Training

4. Look through `ml/raw/<label>/` and delete photos that do not show the item (generic categories such as Scarves, Sweaters and Dogs wearing clothes contain other things), then run `python ml/split.py` again.
5. `pip install -r ml/requirements.txt`, then `python ml/train.py`. It fine-tunes MobileNetV3-small (on the GPU if torch finds one), prints validation accuracy per epoch and the per-class result of the best epoch, and writes `ml/model/knit.onnx` and `ml/model/labels.json` (ignored by git). Not run end to end yet when this was written: if it fails, the error is the bug report.
