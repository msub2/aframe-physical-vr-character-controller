# A-Frame Physical VR Character Controller

This is something I developed for my own use so that I could have a ready-made character controller with smooth locomotion, teleporting, snap turning, smooth turning, and basic physical interactions.

It wraps the hand-controls, vive-controls, oculus-touch-controls, and windows-motion-controls components into an `<a-controller>` primitive, and makes use of glMatrix, aframe-blink-controls, and aframe-physics-system.

It's still early in development, and likely to undergo many changes.

## Usage

While I work out making this ready to put on npm, you can add the following `<script>` tags:
```
<script src="https://mixedreality.mozilla.org/ammo.js/builds/ammo.wasm.js"></script>
<script src="https://raw.githubusercontent.com/msub2/aframe-physical-vr-character-controller/main/dist/aframe-physical-vr-character-controller.min.js"></script>
```

To use the character controller, just copy the following HTML code into your `<a-scene>`:

    <a-entity id="player">
        <a-entity id="head" camera wasd-controls look-controls></a-entity>
        <a-controller id="controllerL" hand="left" move="true"></a-controller>
        <a-controller id="controllerR" hand="right" turn-type="snap"></a-controller>
    </a-entity>

By default, this will give you:

- Teleportation with trigger on both hands
- Smooth locomotion on the left thumbstick/trackpad with a speed of 2
- Snap turning on the right thumbstick/trackpad with a default snap angle of 45 degrees.
- A default physics configuration based off my own testing.

Movement and rotation have been allocated to their specific controllers based on what I feel is most common practice, but you can easily make modifications to change them.

## Components

There are currently four components: smooth-locomotion, turn-controls, grabber, and grabbable.

### smooth-locomotion

Allows for smooth locomotion based on left thumbstick axis input.

| Attribute Name | Type  | Default Value | Info                                                      |
| -------------- | ----- | ------------- | --------------------------------------------------------- |
| speed          | float | 2             | Player movement speed                                     |
| active         | bool  | false         | Whether controller should be used to move                 |
| fly            | bool  | false         | Allows player to move up and down based on look direction |

### turn-controls

Allows for either smooth turning or snap turning based off the right thunmbstick X-axis input.

| Attribute Name | Type   | Default Value | Info                                                                                                                                                         |
| -------------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| turnType       | string | "none"        | Method of turning. "none" disables the component. "snap" uses snap turning. "smooth" uses smooth turning. Anything else will log an error and act as "none". |
| snapDegrees    | bool   | 45            | Angle in degrees to rotate player on snap                                                                                                                    |
| turnSpeed      | bool   | 2             | Player smooth turning speed                                                                                                                                  |

### grabber

Allows the player to grab and throw objects with the `grabbable` component. Currently, no attributes.

### grabbable

Marks an object as able to be grabbed. Currently, no attributes.
