const getMonth = (): string[] => {
  const num = new Date().getMonth() + 1;
  const daynum: string[] = [];
  for (let i = 0; i < num; i++) {
    daynum.push(`${i + 1}月`);
  }
  return daynum;
};

const getDays = (): string[] => {
  const num = new Date().getDate();
  const daynum: string[] = [];
  for (let i = 0; i < num; i++) {
    daynum.push(`${i + 1}号`);
  }
  return daynum;
};

const getHour = (): string[] => {
  const num = new Date().getHours();
  const daynum: string[] = [];
  for (let i = 0; i <= num; i++) {
    daynum.push(`${i}时`);
  }
  return daynum;
};

const getHourall = (): string[] => {
  const daynum: string[] = [];
  for (let i = 0; i < 24; i++) {
    daynum.push(`${i + 1}`);
  }
  return daynum;
};

const getXData = (flag: "TODAY" | "THIS_MONTH" | "THIS_YEAR", list: Array<{ timeFlag: number }>): string[] => {
  if (flag === "TODAY") {
    return list.map((res) => `${res.timeFlag}时`);
  }
  if (flag === "THIS_MONTH") {
    return list.map((res) => `${res.timeFlag}号`);
  }
  return list.map((res) => `${res.timeFlag}月`);
};

const getDaysThree = (): string[] => {
  return new Array(30)
    .fill(0)
    .map((_, idx) => {
      const d = new Date(new Date().getTime() - idx * (24 * 60 * 60 * 1000));
      return `${d.getMonth() + 1}-${d.getDate()}`;
    })
    .reverse();
};

const xInfo = (list: unknown[]) => list.map((_res, index) => index + 1);

const getUsageYear = () => {
  const currentDecade = new Date().getFullYear();
  const decadesArray: Array<{ label: number; value: number }> = [];
  for (let i = 0; i < currentDecade - 2012; i++) {
    decadesArray.push({ label: currentDecade - i, value: currentDecade - i });
  }
  return decadesArray;
};

export { getMonth, getDays, getHour, getXData, getDaysThree, getHourall, xInfo, getUsageYear };
