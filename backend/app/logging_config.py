"""Markaziy logging sozlamasi.

`logging.getLogger("picasso")` orqali ilova bo'ylab bitta nomli logger ishlatiladi.
Muhim mutatsiyalar (sotuv, ishlab chiqarish, o'chirish, kassa) shu logger orqali
yoziladi — keyinchalik audit/monitoring uchun asos bo'ladi.
"""
import logging
import sys

logger = logging.getLogger("picasso")


def setup_logging(level: int = logging.INFO) -> None:
    if logger.handlers:        # qayta sozlanmasin (reload paytida)
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
