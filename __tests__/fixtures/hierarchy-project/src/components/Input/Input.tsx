// Input component
import React from 'react'
import { Button } from '../Button/Button'

export function Input(props: { placeholder: string }) {
  return (
    <div>
      <input placeholder={props.placeholder} />
      <Button label="Submit" />
    </div>
  )
}
