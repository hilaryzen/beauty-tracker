import { Button } from "@chakra-ui/react"

type AddMinusButtonsProps = {
  onAddClick: () => void;
  onMinusClick: () => void;
}

export const AddMinusButtons = ({ onAddClick, onMinusClick }: AddMinusButtonsProps) => {
  return (
    <>
      <Button onClick={onAddClick}>+</Button>
      <Button onClick={onMinusClick}>-</Button>
    </>
  )
}