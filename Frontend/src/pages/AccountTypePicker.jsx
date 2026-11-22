import React from "react";

export default function AccountTypePicker({ onChoose }) {
  return (
    <div className="account-type-picker" role="group" aria-label="Account type">
      <button className="outline" type="button" onClick={() => onChoose("Student")}>Student</button>
      <button className="outline" type="button" onClick={() => onChoose("Clubs")}>Club</button>
    </div>
  );
}
