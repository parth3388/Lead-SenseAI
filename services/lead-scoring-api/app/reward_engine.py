from typing import Union


def calculate_reward(lead_score: Union[int, float], converted: bool) -> int:
    """Compute reward points for an agent based on lead outcome.

    Parameters
    ----------
    lead_score : int | float
        Score assigned to the lead (0-100).
    converted : bool
        Whether the lead converted into a sale.

    Returns
    -------
    int
        Total reward points awarded.
    """

    points = 0

    if lead_score >= 80:
        points += 10

    if converted:
        points += 50

    # bonus for high quality lead that also converted
    if lead_score >= 80 and converted:
        points += 20

    return points
