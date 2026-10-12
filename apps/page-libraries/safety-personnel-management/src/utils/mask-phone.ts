export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 7) {
    return phone || "--";
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
};
