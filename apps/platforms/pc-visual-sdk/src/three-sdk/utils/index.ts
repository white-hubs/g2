import * as THREE from "three";
export const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min)) + min;
};
export const getDegree = (radian: number): number => {
  return (radian / Math.PI) * 180;
};
export const getRadian = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};
export const getUniqueId = (): string => {
  return window.performance.now().toString().replace(".", "");
};
export const getSpherical = (rad1: number, rad2: number, r: number): THREE.Vector3 => {
  const x = Math.cos(rad1) * Math.cos(rad2) * r;
  const z = Math.cos(rad1) * Math.sin(rad2) * r;
  const y = Math.sin(rad1) * r;
  return new THREE.Vector3(x, y, z);
};
