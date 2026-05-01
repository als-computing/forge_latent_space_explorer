export type ModelType =
  | 'latent_space_extraction'
  | 'dimension_reduction'
  | 'clustering'

export interface GuiParameter {
  type: 'int' | 'float' | 'slider' | 'dropdown'
  name: string
  title: string
  param_key: string
  value: number
  options?: { label: string | number; value: number }[]
  min?: number
  max?: number
  step?: number
  marks?: Record<string, string>
}

export interface Model {
  model_name: string
  version: string
  type: ModelType
  description: string
  gui_parameters: GuiParameter[]
}

export type ParameterValues = Record<string, number>
