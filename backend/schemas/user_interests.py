from pydantic import BaseModel

class UserInterestsUpdate(BaseModel):
    interest_ids: list[int]
