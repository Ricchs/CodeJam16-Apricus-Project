from dataclasses import dataclass
from datetime import datetime, time
from zoneinfo import ZoneInfo

MONTREAL = ZoneInfo("America/Montreal")


@dataclass
class TimeBlock:
    weekday: int
    start_time: time
    end_time: time


@dataclass
class Lobby:
    interest_id: int
    start_time: datetime
    end_time: datetime


def overlaps(
    block_start: time, block_end: time, lobby_start: time, lobby_end: time
) -> bool:
    """
    Returns True if the lobby's time overlaps the user's busy block.
    Intervals that only touch (one ends exactly when the other starts) don't overlap.
    """
    return lobby_start < block_end and lobby_end > block_start


def is_free(blocks: list[TimeBlock], lobby: Lobby) -> bool:
    """
    Returns True if none of the user's time blocks overlaps with the lobby.
    Does not handle lobbies crossing midnight.
    """
    lobby_start = lobby.start_time.astimezone(MONTREAL)
    lobby_end = lobby.end_time.astimezone(MONTREAL)
    lobby_weekday = lobby_start.weekday()
    lobby_start_time = lobby_start.time()
    lobby_end_time = lobby_end.time()
    return not any(
        block.weekday == lobby_weekday
        and overlaps(block.start_time, block.end_time, lobby_start_time, lobby_end_time)
        for block in blocks
    )


if __name__ == "__main__":
    blocks = [
        TimeBlock(
            weekday=0, start_time=time(10, 0), end_time=time(11, 30)
        ),  # Mon 10:00–11:30
        TimeBlock(
            weekday=0, start_time=time(14, 30), end_time=time(16, 0)
        ),  # Mon 14:30–16:00
        TimeBlock(
            weekday=1, start_time=time(8, 30), end_time=time(10, 0)
        ),  # Tue 08:30–10:00
        TimeBlock(
            weekday=1, start_time=time(13, 0), end_time=time(14, 30)
        ),  # Tue 13:00–14:30
        TimeBlock(
            weekday=2, start_time=time(10, 0), end_time=time(11, 30)
        ),  # Wed 10:00–11:30
        TimeBlock(
            weekday=3, start_time=time(8, 30), end_time=time(10, 0)
        ),  # Thu 08:30–10:00
        TimeBlock(
            weekday=3, start_time=time(16, 0), end_time=time(18, 0)
        ),  # Thu 16:00–18:00
        TimeBlock(
            weekday=4, start_time=time(11, 30), end_time=time(13, 0)
        ),  # Fri 11:30–13:00
    ]
    touching = Lobby(
        interest_id=1,
        start_time=datetime(2026, 11, 26, 15, 0, tzinfo=MONTREAL),  # Mon 11:30
        end_time=datetime(2026, 11, 26, 19, 0, tzinfo=MONTREAL),  # Mon 12:00
    )

    print(is_free(blocks, touching))
