![StaticMesh-01](https://user-images.githubusercontent.com/28584767/157966574-5d2b1987-2738-41cb-b193-e413e68d8532.jpg)

# THREE.StaticMesh
Lightweight mesh class for faster rendering, to reduce memory and matrix computations, no core modifications required.

[Get it here](https://gumroad.com/l/payks)

You can archive up to 50% better performance regarding computations and culling compared to meshes with matrixAutoUpdate set to false. The benefit increases by the number of meshes and complexity in the scene. This plugin runs out of box without core modifications.


**When do i benefit?**

Generally you save a lot computations and memory, you get the most benefit in a large scene with several thousand objects, with many being outside/beyond the camera frustum far plane. With all objects visible on screen you can still gain several FPS, around 5-10%.

**Saving memory**

The THREE.Object3D class creates a lot objects in it's constructor, some you probably not even require such as an individual up vector or layers object, many matrices and also 2 callbacks are created to synchronize euler rotation with the quaternion property what is more of a legacy issue.

StaticMesh is reduced to a few primitives and the worldMatrix, children array only if necessary. For a large scene this has a huge impact. Especially if you have multiple maps/levels you already hold in memory.


**Better performance**

Culling is improved with less computations and compound culling, this means if the static mesh with it's children isn't visible, the children are discarded already. This is specifically useful for assets consisting of sub-meshes, for example a tree with a separate trunk and crown mesh and to group some meshes such as a building with it's interiors.


**Moving static meshes**

To move or rotate a static mesh or one of it's children, you can use them like regular objects or restore the state to the source and apply the hierarchy then again (recommended for multiple changes)

    staticMesh.position.x = 10;
    staticMesh.rotateY( THREE.Math.DEG2RAD * 90 );

Restore and save:

    // Restore hierarchy transformation to source, apply manipulations then save it back to the static mesh

    const source = staticMesh.restore();

    source.position.x += 100;

    staticMesh.save();



To create a static mesh. Avoid using the original mesh if you want to transform any of the static meshes created from it again (use a clone if required), the source is used to restore and update the transformation.

`const staticMesh = regularMesh.toStatic();`
