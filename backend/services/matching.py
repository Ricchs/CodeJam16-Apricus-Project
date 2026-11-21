from dataclasses import dataclass
from datetime import datetime, time
from math import log
from zoneinfo import ZoneInfo

MONTREAL = ZoneInfo("America/Montreal")

TIME_CURVE_C = 0.2
TIME_CUTOFF_HOURS = 336  # 2 weeks
FILL_CURVE_H = 0.25

W_INTEREST = 0.4
W_TIME = 0.3
W_MEMBERS = 0.2
W_FILL = 0.1


@dataclass
class TimeBlock:
    weekday: int
    start_time: time
    end_time: time


@dataclass
class Lobby:
    id: int
    interest_id: int
    start_time: datetime
    end_time: datetime
    capacity: int
    member_interests: list[set[int]]


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


def time_score(lobby: Lobby, now: datetime) -> float:
    """
    Returns a score in [0, 1]: 1 if the lobby starts now, dropping on a log
    curve to 0 at TIME_CUTOFF_HOURS. Lobbies already started or beyond the
    cutoff score 0.
    """
    time_until_start = (lobby.start_time - now).total_seconds() / 3600
    if time_until_start < 0 or time_until_start >= TIME_CUTOFF_HOURS:
        return 0.0

    return 1 - (log(1 + time_until_start / TIME_CURVE_C)) / (
        log(1 + TIME_CUTOFF_HOURS / TIME_CURVE_C)
    )


def fill_score(members: int, capacity: int) -> float:
    if members >= capacity:
        return 0.0

    ratio = members / capacity
    return (1 - 2 ** (-ratio / FILL_CURVE_H)) / (1 - 2 ** (-1 / FILL_CURVE_H))


def interest_match(user_interests: set[int], lobby_interest: int) -> float:
    if lobby_interest in user_interests:
        return 1.0
    return 0.0


def jaccard(a: set[int], b: set[int]) -> float:
    """
    Jaccard similarity between two sets: shared items / all distinct items.
    Returns a value in [0, 1]; 0.0 if both sets are empty.
    """
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def member_similarity(
    user_interests: set[int], member_interests: list[set[int]]
) -> float:
    """
    Average Jaccard similarity between the user's interests and each lobby
    member's interests. Returns a value in [0, 1]; 0.0 if the lobby has no members.
    """
    if not member_interests:
        return 0.0

    scores = [jaccard(user_interests, member) for member in member_interests]
    return sum(scores) / len(scores)


def score(user_interests: set[int], lobby: Lobby, now: datetime) -> float:
    """Weighted relevance score in [0, 1]. Higher = shown earlier in the deck."""
    return (
        W_INTEREST * interest_match(user_interests, lobby.interest_id)
        + W_TIME * time_score(lobby, now)
        + W_MEMBERS * member_similarity(user_interests, lobby.member_interests)
        + W_FILL * fill_score(len(lobby.member_interests), lobby.capacity)
    )


def is_eligible(blocks: list[TimeBlock], lobby: Lobby, now: datetime) -> bool:
    """Hard filters: the lobby must be joinable and fit the user's schedule."""
    hours_until = (lobby.start_time - now).total_seconds() / 3600

    if hours_until < 0:
        return False
    if hours_until >= TIME_CUTOFF_HOURS:
        return False
    if len(lobby.member_interests) >= lobby.capacity:
        return False
    return is_free(blocks, lobby)


def rank_lobbies(
    user_interests: set[int],
    blocks: list[TimeBlock],
    lobbies: list[Lobby],
    now: datetime,
) -> list[Lobby]:
    """Returns the eligible lobbies, best match first."""
    eligible = [lobby for lobby in lobbies if is_eligible(blocks, lobby, now)]
    return sorted(
        eligible,
        key=lambda lobby: score(user_interests, lobby, now),
        reverse=True,
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
    user_interests = {1, 2, 3}
    now = datetime(2026, 11, 23, 9, 0, tzinfo=MONTREAL)

    lobbies = [
        # --- should be ELIGIBLE ---
        Lobby(id="A_basketball_lunch", interest_id=1,
              start_time=datetime(2026, 11, 23, 12, 0, tzinfo=MONTREAL),   # Mon 12:00 (free gap)
              end_time=datetime(2026, 11, 23, 13, 0, tzinfo=MONTREAL),
              capacity=4, member_interests=[{1, 2}, {1, 4}]),
        Lobby(id="B_gym_lunch", interest_id=4,
              start_time=datetime(2026, 11, 23, 12, 0, tzinfo=MONTREAL),   # Mon 12:00, not an interest
              end_time=datetime(2026, 11, 23, 13, 0, tzinfo=MONTREAL),
              capacity=4, member_interests=[{4, 5}]),
        Lobby(id="C_coding_tuesday", interest_id=2,
              start_time=datetime(2026, 11, 24, 15, 0, tzinfo=MONTREAL),   # Tue 15:00 (free)
              end_time=datetime(2026, 11, 24, 16, 0, tzinfo=MONTREAL),
              capacity=6, member_interests=[{2, 3}, {1, 2, 3}]),
        Lobby(id="G_eat_next_week", interest_id=5,
              start_time=datetime(2026, 11, 30, 12, 0, tzinfo=MONTREAL),   # next Mon 12:00
              end_time=datetime(2026, 11, 30, 13, 0, tzinfo=MONTREAL),
              capacity=4, member_interests=[]),

        # --- should be FILTERED OUT ---
        Lobby(id="D_during_class", interest_id=1,
              start_time=datetime(2026, 11, 23, 10, 30, tzinfo=MONTREAL),  # Mon 10:30, in class
              end_time=datetime(2026, 11, 23, 11, 0, tzinfo=MONTREAL),
              capacity=4, member_interests=[]),
        Lobby(id="E_full", interest_id=1,
              start_time=datetime(2026, 11, 23, 17, 0, tzinfo=MONTREAL),   # Mon 17:00, 2/2 full
              end_time=datetime(2026, 11, 23, 18, 0, tzinfo=MONTREAL),
              capacity=2, member_interests=[{1}, {2}]),
        Lobby(id="F_already_started", interest_id=2,
              start_time=datetime(2026, 11, 23, 8, 0, tzinfo=MONTREAL),    # started at 08:00
              end_time=datetime(2026, 11, 23, 8, 45, tzinfo=MONTREAL),
              capacity=4, member_interests=[]),
        Lobby(id="H_too_far", interest_id=1,
              start_time=datetime(2026, 12, 14, 12, 0, tzinfo=MONTREAL),   # 3 weeks away
              end_time=datetime(2026, 12, 14, 13, 0, tzinfo=MONTREAL),
              capacity=4, member_interests=[]),
    ]

    for lobby in rank_lobbies(user_interests, blocks, lobbies, now):
        print(lobby.id, round(score(user_interests, lobby, now), 3))