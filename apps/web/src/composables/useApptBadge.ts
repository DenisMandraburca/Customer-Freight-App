export interface ApptBadgeResult {
  show: boolean;
  text: string;
  className: string;
}

export function renderApptBadge(apptFlag: boolean, apptTime: string | null): ApptBadgeResult {
  if (!apptFlag) {
    return {
      show: false,
      text: '',
      className: '',
    };
  }

  if (!apptTime || apptTime.trim() === '' || apptTime === 'Please, Set the APPT') {
    return {
      show: true,
      text: 'APPT needed',
      className:
        'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    };
  }

  return {
    show: true,
    text: apptTime,
    className:
      'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
}
