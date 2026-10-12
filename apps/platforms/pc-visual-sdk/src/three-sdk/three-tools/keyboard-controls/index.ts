import { EventDispatcher, Quaternion, Clock, Vector3, type Camera } from "three";
interface MoveSyaye {
  up: number;
  down: number;
  left: number;
  right: number;
  forward: number;
  back: number;
  pitchUp: number;
  pitchDown: number;
  yawLeft: number;
  yawRight: number;
  rollLeft: number;
  rollRight: number;
}
export default class KeyboardControls extends EventDispatcher {
  public movementSpeed: number = 10;
  public rollSpeed: number = 0.1;
  public enabled: boolean = true;
  private readonly camera: Camera;
  private movementSpeedMultiplier: number = 0;
  private readonly domElement: HTMLDivElement;
  private readonly autoForward: boolean = false;
  private readonly clock: Clock = new Clock();
  private readonly tmpQuaternion: Quaternion = new Quaternion();
  private readonly moveState: MoveSyaye = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    forward: 0,
    back: 0,
    pitchUp: 0,
    pitchDown: 0,
    yawLeft: 0,
    yawRight: 0,
    rollLeft: 0,
    rollRight: 0,
  };
  private readonly status: number = 0;
  private readonly movementVector: Vector3 = new Vector3(0, 0, 0);
  private readonly rotationVector: Vector3 = new Vector3(0, 0, 0);
  public constructor(camera: Camera, domElement: HTMLDivElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    window.addEventListener("keydown", this.addEventKeydown.bind(this), false);
    window.addEventListener("keyup", this.addEventKeyup.bind(this), false);

    this.updateMovementVector();
    this.updateRotationVector();
  }

  public update(): void {
    if (!this.enabled) return;
    const delta = this.clock.getDelta();
    const translateMult = delta * this.movementSpeed;
    const rotMult = delta * this.rollSpeed;
    this.camera.translateX(this.movementVector.x - translateMult);
    this.camera.translateY(this.movementVector.y - translateMult);
    this.camera.translateZ(this.movementVector.z - translateMult);
    this.tmpQuaternion
      .set(this.rotationVector.x * rotMult, this.rotationVector.y * rotMult, this.rotationVector.z * rotMult, 1)
      .normalize();
    this.camera.quaternion.multiply(this.tmpQuaternion);
  }

  public dispose(): void {
    window.removeEventListener("keydown", this.addEventKeydown.bind(this), false);
    window.removeEventListener("keyup", this.addEventKeyup.bind(this), false);
  }

  private addEventKeydown(event: KeyboardEvent): void {
    if (event.altKey || !this.enabled) return;

    switch (event.code) {
      case "ShiftLeft":
      case "ShiftRight":
        this.movementSpeedMultiplier = 1;
        break;

      case "KeyW":
        this.moveState.forward = 0;
        break;
      case "KeyS":
        this.moveState.back = 0;
        break;

      case "KeyA":
        this.moveState.left = 0;
        break;
      case "KeyD":
        this.moveState.right = 0;
        break;

      case "KeyR":
        this.moveState.up = 0;
        break;
      case "KeyF":
        this.moveState.down = 0;
        break;

      case "KeyQ":
        this.moveState.rollRight = 0;
        break;
      case "KeyE":
        this.moveState.rollLeft = 0;
        break;

      case "ArrowUp":
        this.moveState.pitchUp = 0;
        break;
      case "ArrowDown":
        this.moveState.pitchDown = 0;
        break;

      case "ArrowLeft":
        this.moveState.yawLeft = 0;
        break;
      case "ArrowRight":
        this.moveState.yawRight = 0;
        break;
    }

    this.updateMovementVector();
    this.updateRotationVector();
  }

  private addEventKeyup(event: KeyboardEvent): void {
    if (event.altKey || !this.enabled) return;
    switch (event.code) {
      case "ShiftLeft":
      case "ShiftRight":
        this.movementSpeedMultiplier = 0.1;
        break;

      case "KeyW":
        this.moveState.forward = 1;
        break;
      case "KeyS":
        this.moveState.back = 1;
        break;

      case "KeyA":
        this.moveState.left = 1;
        break;
      case "KeyD":
        this.moveState.right = 1;
        break;

      case "KeyR":
        this.moveState.up = 1;
        break;
      case "KeyF":
        this.moveState.down = 1;
        break;

      case "KeyQ":
        this.moveState.rollRight = 1;
        break;
      case "KeyE":
        this.moveState.rollLeft = 1;
        break;

      case "ArrowUp":
        this.moveState.pitchUp = 1;
        break;
      case "ArrowDown":
        this.moveState.pitchDown = 1;
        break;

      case "ArrowLeft":
        this.moveState.yawLeft = 1;
        break;
      case "ArrowRight":
        this.moveState.yawRight = 1;
        break;
    }

    this.updateMovementVector();
    this.updateRotationVector();
  }

  private updateMovementVector(): void {
    const forward = this.moveState.forward || (this.autoForward && !this.moveState.back) ? 1 : 0;
    this.movementVector.x = -this.moveState.left + this.moveState.right;
    this.movementVector.y = -this.moveState.down + this.moveState.up;
    this.movementVector.z = -forward + this.moveState.back;
  }

  private updateRotationVector(): void {
    this.rotationVector.x = -this.moveState.pitchDown + this.moveState.pitchUp;
    this.rotationVector.y = -this.moveState.yawRight + this.moveState.yawLeft;
    this.rotationVector.z = -this.moveState.rollRight + this.moveState.rollLeft;
  }
}
