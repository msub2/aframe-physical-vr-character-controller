AFRAME.registerComponent('smooth-locomotion', {
    schema: {
        speed: { type: 'float', default: 2 },
        active: { type: 'boolean', default: false },
        fly: { type: 'boolean', default: false }
    },
    init: function () {
        // Do nothing if this controller isn't meant to smooth locomote
        if (!this.data.active) return;

        // Get scene element references
        this.player = document.querySelector('#player');
        this.head = document.querySelector('#head');
        const controllerL = document.querySelector('#controllerL');

        // Set up variables to store controller input data
        this.moveX = 0;
        this.moveY = 0;
        this.thumbstickPressed = false;

        // Physics body
        this.world;
        this.body = null;
        this.lastPos = new THREE.Vector3();
        this.headPos = new THREE.Vector3();
        this.btDirection = null;
        this.btZero = null;

        // Hook up event listeners for the relevant movement input events.
        controllerL.addEventListener('axismove', (event) => {
            this.moveX = event.detail.axis[2] != 0 ? event.detail.axis[2] : event.detail.axis[0];
            this.moveY = event.detail.axis[3] != 0 ? event.detail.axis[3] : event.detail.axis[1];
        });
        controllerL.addEventListener('thumbstickdown', () => { this.thumbstickPressed = true; });
        controllerL.addEventListener('thumbstickup', () => { this.thumbstickPressed = false; });
        this.player.addEventListener('body-loaded', (e) => {
            if (e.detail.body.el.id == "player") {
                this.body = this.player.body;
                this.body.setActivationState(4); //DISABLE_DEACTIVATION
                this.world = AFRAME.scenes[0].systems.physics.driver.physicsWorld
                this.body.setAngularFactor(new Ammo.btVector3(0, 0, 0));

                this.btDirection = new Ammo.btVector3();
                this.btZero = new Ammo.btVector3(0, 0, 0);
            }
        });
        this.player.addEventListener('teleported', (e) => {
            const p = e.detail.newPosition;
            const newPos = new Ammo.btVector3(p.x, p.y, p.z)
            this.body.getWorldTransform().setOrigin(newPos);
            Ammo.destroy(newPos);

            const q = e.detail.rotationQuaternion;
            const newRot = new Ammo.btQuaternion(q.x, q.y, q.z, q.w);
            this.body.getWorldTransform().setRotation(newRot);
            Ammo.destroy(newRot);
        })
    },
    tick: function (time, timeDelta) {
        // Do nothing if this controller isn't meant to smooth locomote
        if (!this.data.active) return;

        if (this.body != null) {
            // Adjust body collider based on head location
            this.handleHead();

            // If there's input coming in, move the player
            if (this.moveX + this.moveY != 0) {
                this.move(this.moveX, this.moveY, timeDelta / 1000);
            }
        }
    },
    move: function (x, y) {
        let direction = [x, 0, y]; // Initial move vector from the controller
        let headRot = head.object3D.quaternion.toArray(); // Head rotation as quaternion so glMatrix can read it

        // Rotate our input vector by our head rotation, then scale by speed
        glMatrix.vec3.transformQuat(direction, direction, headRot);
        glMatrix.vec3.scale(direction, direction, this.data.speed);

        // Zero out Y if player shouldn't translate on Y axis
        if (!this.fly) direction[1] = 0;

        // Move player (bullet)
        this.btDirection.setValue(direction[0], direction[1], direction[2]);
        this.body.setLinearVelocity(this.btDirection);
    },
    handleHead: function () {
        this.player.removeAttribute('ammo-shape');
        this.headPos.setFromMatrixPosition(this.head.object3D.matrixWorld);
        this.player.setAttribute('ammo-shape', {
            type: 'capsule',
            fit: 'manual',
            halfExtents: `.15 ${this.headPos.y / 2} .15`,
            offset: `${this.headPos.x - this.player.object3D.position.x} ${this.headPos.y / 2} ${this.headPos.z - this.player.object3D.position.z}`
        });
    }
});

AFRAME.registerComponent('turn-controls', {
    schema: {
        turnType: { type: 'string', default: 'none' },
        snapDegrees: { type: 'float', default: 45 },
        turnSpeed: { type: 'float', default: 2 }
    },
    init: function () {
        // Do nothing if this controller isn't meant to turn or the turnType is invalid
        if (this.data.turnType == 'none') return;
        this.invalid = this.data.turnType != 'snap' && this.data.turnType != 'smooth'
        if (this.invalid) {
            console.log("You have not entered a valid turnType! Only none, snap, and smooth are accepted.");
            return;
        }

        // Get scene element references
        this.player = document.querySelector('#player');
        this.head = document.querySelector('#head');
        const controllerR = document.querySelector('#controllerR');

        // Set up variables to read controller input and control turn logic
        this.rotateX = 0;
        this.justSnapped = false;
        this.unsnapZone = .99;

        // Set up variables to facilitate position adjustment after turning
        this.preRotHeadPos = new THREE.Vector3();
        this.currentHeadPos = new THREE.Vector3();
        this.posAdjustNeeded = false;
        this.posAdjustDelayed = false;
        this.headOffset = new THREE.Vector3();
        this.newPlayerPos = new THREE.Vector3();

        // Physics
        this.body = null;
        this.btPlayerRotation = null;
        this.btNewPlayerPos = null;


        // Hook up event listeners for the relevant turning input events
        controllerR.addEventListener('axismove', (event) => {
            this.rotateX = event.detail.axis[2] != 0 ? event.detail.axis[2] : event.detail.axis[0];
        });
        this.player.addEventListener('body-loaded', () => {
            this.body = this.player.body;

            this.btPlayerRotation = new Ammo.btQuaternion();
            this.btNewPlayerPos = new Ammo.btVector3();
        });
    },
    tick: function (time, timeDelta) {
        // Do nothing if this controller isn't meant to turn or the turnType is invalid
        if (this.data.turnType == 'none' || this.invalid) return;

        // Adjust position and turn based on schema        
        if (this.posAdjustNeeded) this.posAdjust();
        if (this.data.turnType == 'snap') this.snapTurn();
        if (this.data.turnType == 'smooth') this.smoothTurn(timeDelta / 1000);

    },
    snapTurn: function () {
        // If player hasn't snapped yet and input is max on either end, rotate the player by snapDegrees        
        if (!this.justSnapped && Math.abs(this.rotateX) == 1) {
            this.preRotHeadPos.setFromMatrixPosition(this.head.object3D.matrixWorld);

            let tempObj = this.player.object3D.clone();
            tempObj.rotateY(this.data.snapDegrees * (Math.PI / 180) * -this.rotateX);

            let q = tempObj.quaternion;
            this.btPlayerRotation.setValue(q.x, q.y, q.z, q.w);
            this.body.getWorldTransform().setRotation(btPlayerRotation);

            this.justSnapped = true;
            this.posAdjustNeeded = true;
        }
        // If player has snapped, check to see if they've moved away from either end
        else if (this.rotateX > -this.unsnapZone && this.rotateX < this.unsnapZone)
            this.justSnapped = false;
    },
    smoothTurn: function (dt) {
        // If there's input, rotate the player smoothly
        if (this.rotateX != 0) {
            this.player.object3D.rotateY(-this.rotateX * dt * this.data.turnSpeed);

            let q = this.player.object3D.quaternion;
            this.btPlayerRotation.setValue(q.x, q.y, q.z, q.w);
            this.body.getWorldTransform().setRotation(btPlayerRotation);

            this.posAdjustNeeded = true;
        }
    },
    posAdjust: function () {
        /*
        You need to adjust for your shifted head position after rotating the player rig,
        but it doesn't work on the same tick as the turn because of some nonsense with A-Frame and WebXR.
        So instead, this function corrects for it TWO TICKS after the turn
        because of position overwrites between three.js and ammo.js from aframe-physics-system
        */
        if (this.posAdjustDelayed) {
            this.currentHeadPos.setFromMatrixPosition(this.head.object3D.matrixWorld);

            this.headOffset.subVectors(this.preRotHeadPos, this.currentHeadPos);
            this.newPlayerPos.addVectors(this.player.object3D.position, this.headOffset);

            this.btNewPlayerPos.setValue(this.newPlayerPos.x, this.newPlayerPos.y, this.newPlayerPos.z);
            this.body.getWorldTransform().setOrigin(btNewPlayerPos);

            this.posAdjustNeeded = false;
            this.posAdjustDelayed = false;
        }
        else {
            this.posAdjustDelayed = true;
        }
    }
});

AFRAME.registerComponent('grabber', {
    schema: {
        default: true
    },
    init: function () {
        this.currentGrabbable = null;
        this.closestGrabbable = null;

        this.el.addEventListener('collidestart', (e) => {
            this.closestGrabbable = e.detail.targetEl;
        });
        this.el.addEventListener('collideend', () => {
            this.closestGrabbable = null;
        });
        this.el.addEventListener('buttondown', (e) => {
            if (e.detail.id == 1 && this.closestGrabbable != null) {
                this.currentGrabbable = this.closestGrabbable;
                this.currentGrabbable.components.grabbable.held = true;
                this.currentGrabbable.components.grabbable.hand = this.el;
                if (e.srcElement.id === 'controllerL')
                    this.currentGrabbable.setAttribute('ammo-constraint', 'target: #controllerL');
                else
                    this.currentGrabbable.setAttribute('ammo-constraint', 'target: #controllerR');
            }
        });
        this.el.addEventListener('buttonup', (e) => {
            if (e.detail.id == 1 && this.currentGrabbable != null) {
                this.currentGrabbable.components.grabbable.held = false;
                this.currentGrabbable.components.grabbable.hand = null;
                this.currentGrabbable.removeAttribute('ammo-constraint');
                this.currentGrabbable = null;
            }
        });
    },
    tick: function () {

    }
});

AFRAME.registerComponent('grabbable', {
    schema: {
        default: true // This will eventually be expanded upon
    },
    init: function () {
        this.held = false;
        this.hand = null;
    },
    tick: function () {
        // For future use
    }
});

AFRAME.registerPrimitive('a-controller', {
    defaultComponents: {
        'smooth-locomotion': {},
        'turn-controls': {},
        'hand-controls': {
            hand: 'left',
            handModelStyle: 'lowPoly',
            color: '#ffcccc',
        },
        'vive-controls': {},
        'oculus-touch-controls': {},
        'windows-motion-controls': {},
        'blink-controls': {
            cameraRig: '#player',
            button: 'trigger',
            teleportOrigin: '#head',
        },
        'ammo-body': {
            type: 'kinematic',
            emitCollisionEvents: true,
            collisionFilterGroup: 4,
            collisionFilterMask: 8,
            disableCollision: true,
        },
        'ammo-shape': {
            type: 'sphere',
            fit: 'manual',
            sphereRadius: 0.1,
        },
        grabber: {}
    },
    mappings: {
        hand: 'hand-controls.hand',
        move: 'smooth-locomotion.active',
        speed: 'smooth-locomotion.speed',
        turn: 'turn-controls.active',
        'turn-type': 'turn-controls.turnType',
        'snap-degrees': 'turn-controls.snapDegrees',
        'unsnap-zone': 'turn-controls.unsnapZone',
    },
});
