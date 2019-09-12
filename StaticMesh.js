(function() {

	// Author: Fyrestar info@mevedia.com

	THREE.Frustum.prototype.intersectsObject = function () {

		const sphere = new THREE.Sphere();
		const emptyArray = [];

		return function intersectsObject( object ) {

			const geometry =  object.geometry;

			if ( geometry.boundingSphere === null )
				geometry.computeBoundingSphere();

			if ( object.isStatic ) {

				if ( object.isChild && object.parent.closure )
					return object.parent._visible;

				sphere.radius = object.radius;
				sphere.center.copy( object );

				object._visible = this.intersectsSphere( sphere );

				if ( !object.visible && object.closure ) {

					this.children = emptyArray;

				} else {

					this.children = this._children;

				}

				return object._visible;

			} else {

				sphere.copy( geometry.boundingSphere )
					.applyMatrix4( object.matrixWorld );

			}


			return this.intersectsSphere( sphere );

		};

	}();


	// StaticMesh

	let id = -1;

	const p = new THREE.Vector3;
	const boundingBox = new THREE.Box3;
	const matrix = new THREE.Matrix4;

	THREE.StaticMesh = function( target, parent ) {

		this.id = id -- ; // THREE hides the Object3D id counter ¯\_(ツ)_/¯
		this.index = 0;
		this.parentIndex = 0;

		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.radius = 0;

		this.matrixWorld = new THREE.Matrix4;
		this.parent = parent || null;
		this.isChild = !!parent;

		if ( target ) {

			this.setTarget( target );

		}

	};


	THREE.StaticMesh.prototype = {

		...THREE.Object3D.prototype,
		...THREE.Mesh.prototype,
		...THREE.EventDispatcher.prototype,

		constructor: THREE.StaticMesh,

		isMesh: false,
		isStatic: true,
		isChild: false,


		visible: true,
		closure: true,

		uuid: '',
		name: '',
		type: 'StaticMesh',

		children: [],

		_visible: true,
		_children: [],

		frustumCulled: true,
		renderOrder: 0,
		castShadow: false,
		receiveShadow: false,
		matrixAutoUpdate: false,

		drawMode: THREE.TrianglesMode,
		layers: new THREE.Layers,


		modelViewMatrix: new THREE.Matrix4,
		normalMatrix: new THREE.Matrix3,
		matrix: new THREE.Matrix4,

		up: THREE.Object3D.DefaultUp.clone(),


		restore: function( target ) {

			if ( this.isChild ) {

				console.error('Trying to restore from a child');

				return null;

			} else {

				target = target || this.target;

				let index = -1;
				const self = this;

				target.matrixWorld.copy( this.matrixWorld );
				target.matrix.copy( this.matrixWorld );

				this.matrixWorld.decompose( target.position, target.quaternion, target.scale );

				target.traverse( object => {

					if ( index > -1 ) {

						const child = self._children[ index ];
						const parent = child.parentIndex > -1 ? self._children[ child.parentIndex ] : self;

						matrix.getInverse( parent.matrixWorld );
						matrix.multiply( child.matrixWorld );

						object.matrixWorld.copy( child.matrixWorld );
						object.matrix.copy( matrix );

						matrix.decompose( object.position, object.quaternion, object.scale );

					}

					index ++ ;

				});



				return target;

			}

		},

		save: function() {

			const target = this.target;
			let index = -1;
			const self = this;

			// Apply transformation state

			if ( target.matrixAutoUpdate !== true )
				target.updateMatrix();

			target.updateMatrixWorld( true );


			target.traverse( object => {

				if ( index > -1 ) {

					const child = self._children[ index ];

					child.matrixWorld.copy( object.matrixWorld );


					if ( !target.closure && child.geometry ) {

						if ( !child.geometry.boundingSphere )
							child.geometry.computeBoundingSphere();

						const boundingSphere = child.geometry.boundingSphere;

						child.radius = child.matrixWorld.getMaxScaleOnAxis() * boundingSphere.radius;

						p.copy( boundingSphere.center ).applyMatrix4( child.matrixWorld );

						child.x = p.x;
						child.y = p.y;
						child.z = p.z;

					}


				}

				index ++ ;

			});

			this.matrixWorld.copy( target.matrixWorld );


			// Re-encapsulate

			if ( this.closure && this.children.length )
				this.encapsulate();


			// Cache bounding sphere

			const boundingSphere = target.boundingSphere || this.geometry.boundingSphere;

			this.radius = this.matrixWorld.getMaxScaleOnAxis() * boundingSphere.radius;

			p.copy( boundingSphere.center ).applyMatrix4( this.matrixWorld );

			this.x = p.x;
			this.y = p.y;
			this.z = p.z;

		},


		encapsulate: function() {

			const target = this.target;
			const sphere = target.boundingSphere || new THREE.Sphere;


			target.updateMatrix();

			matrix.copy( target.matrix );

			{

				target.position.set( 0, 0, 0 );
				target.scale.set( 1, 1, 1 );
				target.quaternion.set( 0, 0, 0, 1 );

				target.updateMatrixWorld( true );

				boundingBox.expandByObject( target );
				boundingBox.max.divideScalar( 2 );

				sphere.center.copy( boundingBox.max );
				sphere.radius = Math.sqrt( boundingBox.min.distanceToSquared( boundingBox.max ) );

			}

			matrix.decompose( target.position, target.quaternion, target.scale );

			target.updateMatrixWorld( true );


			target.boundingSphere = sphere;

		},

		setTarget: function( target ) {

			this.target = target;
			this.geometry = target.geometry;
			this.material = target.material;

			if ( target.used === undefined )
				target.used = 0;

			target.used ++ ;

			if ( target.isMesh ) {

				this.isMesh = true;
				this.isSkinnedMesh = false;

				this.drawMode = target.drawMode;
				this.updateMorphTargets();

			}

			if ( target.isSkinnedMesh ) {

				this.isMesh = false;
				this.isSkinnedMesh = true;

				this.skeleton = target.skeleton;
				this.bindMatrix = target.bindMatrix;
				this.bindMatrixInverse = target.bindMatrixInverse;
				this.updateMatrixWorld = target.updateMatrixWorld;

			}



			if ( !this.isChild ) {

				// Flatten hierarchy

				if ( target.children.length  ) {

					let index = 0;
					const self = this;

					this.children = [];
					this._children = this.children;

					target.updateMatrixWorld( true );

					target.index = -1;

					target.traverse( object => {


						if ( index > 0 ) {

							const child = new THREE.StaticMesh( object, self );

							object.index = index - 1;

							child.parentIndex = object.parent.index;

							self.children.push( child )

						}

						index ++ ;

					});

				} else if ( this.children !== this.constructor.prototype.children ) {

					delete this.children;
					delete this._children;

				}



				this.save();


			} else {

				this.matrixWorld.copy( target.matrixWorld );

			}


		},


		updateMatrixWorld: function ( force ) {},

		updateWorldMatrix: function ( updateParents, updateChildren ) {},

		traverse: function ( callback ) {

			callback( this );

			const children = this._children;

			for ( let i = 0, l = children.length; i < l; i ++ ) {

				children[ i ].traverse( callback );

			}

		}

	};

	THREE.Mesh.prototype.toStatic = function() {

		return new THREE.StaticMesh( this );

	};


}());
