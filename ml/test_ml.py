import unittest

from commons import allowed, safe_name
from split import split_of
from openverse import license_name
from weknit import label_of, parse


class Tests(unittest.TestCase):
    def test_license_filter(self):
        for ok in ("CC BY-SA 4.0", "CC0", "Public domain", "cc-by-2.0"):
            self.assertTrue(allowed(ok), ok)
        for bad in ("", "All rights reserved", "Fair use", "CC BY-NC 2.0", "CC BY-ND 4.0", "CC BY-NC-SA 3.0"):
            self.assertFalse(allowed(bad), bad)

    def test_safe_name_is_windows_safe_and_unique(self):
        url = "https://upload.wikimedia.org/x/512px-A%20%22hat%22%3F.jpg?utm_source=commons"
        name = safe_name(42, url)
        self.assertEqual(name, "42_512px-A _hat__.jpg")
        self.assertNotEqual(safe_name(1, url), safe_name(2, url))

    def test_split_is_stable_and_roughly_proportional(self):
        paths = [f"raw/hat/{i}.jpg" for i in range(2000)]
        first = [split_of(p, 0.15) for p in paths]
        self.assertEqual(first, [split_of(p, 0.15) for p in paths])
        share = first.count("val") / len(first)
        self.assertTrue(0.10 < share < 0.20, share)

    def test_weknit_labels_and_page_parsing(self):
        self.assertEqual(label_of("Свитер для собаки спицами"), "dog_sweater")
        self.assertEqual(label_of("Шапка-бини спицами"), "hat")
        self.assertIsNone(label_of("Плед из квадратов"))
        page = parse('<title>Снуд</title><a href="/a/">x</a><img src="/i/1.jpg"><img src="/logo.png"><img src="/s.jpg" width="50">', "https://weknit.ru/p/")
        self.assertEqual(page.title, "Снуд")
        self.assertEqual(page.links, ["https://weknit.ru/a/"])
        self.assertEqual(page.images, ["https://weknit.ru/i/1.jpg"])

    def test_openverse_license_name_passes_the_commons_filter(self):
        self.assertTrue(allowed(license_name({"license": "by-sa", "license_version": "4.0"})))
        self.assertTrue(allowed(license_name({"license": "cc0", "license_version": "1.0"})))


if __name__ == "__main__":
    unittest.main()
