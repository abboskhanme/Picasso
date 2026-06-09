"""O'lchov birliklari konvertatsiyasi (units.py) — sof unit testlar (DB kerak emas)."""
import pytest
from app import units


def test_convert_grams_to_kg():
    assert units.convert(5, "gramm", "kg") == 0.005


def test_convert_kg_to_grams():
    assert units.convert(2, "kg", "gramm") == 2000.0


def test_convert_same_unit_unchanged():
    assert units.convert(7, "kg", "kg") == 7.0


def test_convert_none_unit_unchanged():
    # retsept birligi bo'sh = xomashyo birligi (aylantirilmaydi)
    assert units.convert(3, None, "kg") == 3.0


def test_convert_length():
    assert units.convert(1.5, "metr", "sm") == 150.0


def test_compatible():
    assert units.compatible("kg", "gramm") is True
    assert units.compatible("litr", "ml") is True
    assert units.compatible("kg", "dona") is False
    assert units.compatible("kg", "litr") is False


def test_convert_incompatible_raises():
    with pytest.raises(ValueError):
        units.convert(1, "kg", "litr")
