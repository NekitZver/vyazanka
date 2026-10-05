import unittest

from commons import allowed
from split import split_of


class Tests(unittest.TestCase):
    def test_license_filter(self):
        for ok in ("CC BY-SA 4.0", "CC0", "Public domain", "cc-by-2.0"):
            self.assertTrue(allowed(ok), ok)
        for bad in ("", "All rights reserved", "Fair use", "CC BY-NC 2.0", "CC BY-ND 4.0", "CC BY-NC-SA 3.0"):
            self.assertFalse(allowed(bad), bad)

    def test_split_is_stable_and_roughly_proportional(self):
        paths = [f"raw/hat/{i}.jpg" for i in range(2000)]
        first = [split_of(p, 0.15) for p in paths]
        self.assertEqual(first, [split_of(p, 0.15) for p in paths])
        share = first.count("val") / len(first)
        self.assertTrue(0.10 < share < 0.20, share)


if __name__ == "__main__":
    unittest.main()
