from pydantic import BaseModel


class MlflowModelOption(BaseModel):
    label: str
    value: str | None
