from pydantic import BaseModel, ConfigDict

class InterestOut(BaseModel):
    id: int
    interest: str

    model_config = ConfigDict(from_attributes=True)