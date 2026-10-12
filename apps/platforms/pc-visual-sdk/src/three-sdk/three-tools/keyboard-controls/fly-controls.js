import { EventDispatcher, Quaternion, Vector3, Clock } from "three";

class FlyControls extends EventDispatcher {
  constructor(object, domElement) {
    super();

    this.object = object;
    this.domElement = domElement;
    this.clock = new Clock();
    // API

    // Set to false to disable this control
    this.enabled = true;

    this.movementSpeed = 1.0;
    this.rollSpeed = 0.005;

    this.dragToLook = false;
    this.autoForward = false;

    // disable default target object behavior

    // internals

    const scope = this;

    this.tmpQuaternion = new Quaternion();

    this.status = 0;

    this.moveState = {
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
    this.moveVector = new Vector3(0, 0, 0);
    this.rotationVector = new Vector3(0, 0, 0);

    this.keydown = function (event) {
      if (event.altKey || this.enabled === false) {
        return;
      }

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
    };

    this.keyup = function (event) {
      if (this.enabled === false) return;

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
    };

    this.update = function (delta = null) {
      if (this.enabled === false) return;
      delta = delta ?? this.clock.getDelta();
      const moveMult = delta * scope.movementSpeed;
      const rotMult = delta * scope.rollSpeed;

      scope.object.translateX(scope.moveVector.x * moveMult);
      scope.object.translateY(scope.moveVector.y * moveMult);
      scope.object.translateZ(scope.moveVector.z * moveMult);

      scope.tmpQuaternion
        .set(scope.rotationVector.x * rotMult, scope.rotationVector.y * rotMult, scope.rotationVector.z * rotMult, 1)
        .normalize();
      scope.object.quaternion.multiply(scope.tmpQuaternion);
    };

    this.updateMovementVector = function () {
      const forward = this.moveState.forward || (this.autoForward && !this.moveState.back) ? 1 : 0;

      this.moveVector.x = -this.moveState.left + this.moveState.right;
      this.moveVector.y = -this.moveState.down + this.moveState.up;
      this.moveVector.z = -forward + this.moveState.back;
    };

    this.updateRotationVector = function () {
      this.rotationVector.x = -this.moveState.pitchDown + this.moveState.pitchUp;
      this.rotationVector.y = -this.moveState.yawRight + this.moveState.yawLeft;
      this.rotationVector.z = -this.moveState.rollRight + this.moveState.rollLeft;
    };

    this.getContainerDimensions = function () {
      if (this.domElement !== document) {
        return {
          size: [this.domElement.offsetWidth, this.domElement.offsetHeight],
          offset: [this.domElement.offsetLeft, this.domElement.offsetTop],
        };
      } else {
        return {
          size: [window.innerWidth, window.innerHeight],
          offset: [0, 0],
        };
      }
    };

    this.dispose = function () {
      this.domElement.removeEventListener("keydown", _keydown);
      this.domElement.removeEventListener("keyup", _keyup);
    };

    const _keydown = this.keydown.bind(this);
    this.domElement.tabIndex = 0;
    const _keyup = this.keyup.bind(this);
    this.domElement.addEventListener("keydown", _keydown);
    this.domElement.addEventListener("keyup", _keyup);

    this.updateMovementVector();
    this.updateRotationVector();
  }
}

export { FlyControls };
