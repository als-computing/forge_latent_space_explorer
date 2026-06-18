from typing import Any, Literal

from pydantic import BaseModel


class GuiParameter(BaseModel):
    type: str
    name: str
    title: str
    param_key: str
    value: Any
    options: list[dict] | None = None
    min: float | None = None
    max: float | None = None
    step: float | None = None
    marks: dict | None = None


class Model(BaseModel):
    model_name: str
    version: str
    type: Literal["latent_space_extraction", "dimension_reduction", "clustering"]
    description: str
    gui_parameters: list[GuiParameter]
