// Shared question + answer row for audit and inspection forms.
//
// Layout only: the answer controls are passed in as children, so each form
// keeps its own field names, stored values, validation and colours. Give
// answer buttons (or radio labels) className={answerOption} and wrap their
// text in <span className={answerOptionLabel}>; give a dropdown
// className={answerSelect}. Do not set display, flex, width or min-width on
// the row or the controls inline -- inline styles win over these classes and
// would bring the phone overflow back.
//
// scripts/check-audit-mobile.mjs proves every audit route at 320-414px.

import styles from './AnswerRow.module.css';

export const answerOption = styles.option;
export const answerOptionLabel = styles.optionLabel;
export const answerSelect = styles.select;

export default function AnswerRow({ label, children, style, labelStyle, answersStyle }) {
  return (
    <div className={styles.row} style={style}>
      <span className={styles.question} style={labelStyle}>{label}</span>
      <div className={styles.answers} style={answersStyle} data-answer-row="">
        {children}
      </div>
    </div>
  );
}
