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
	const s = new THREE.Vector3;
	const q = new THREE.Quaternion;
	const boundingBox = new THREE.Box3;
	const matrix = new THREE.Matrix4;

	const position = new THREE.Vector3;
	const scale = new THREE.Vector3;
	const rotation = new THREE.Euler;
	const quaternion = new THREE.Quaternion;


	THREE.StaticMesh = function( source, parent ) {

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

		if ( source ) {

			this.setSource( source );

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

				target = target || this.source;

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

			const source = this.source;
			let index = -1;
			const self = this;

			// Apply transformation state

			if ( source.matrixAutoUpdate !== true )
				source.updateMatrix();

			source.updateMatrixWorld( true );

			source.traverse( object => {

				if ( index > -1 ) {

					const child = self._children[ index ];

					child.matrixWorld.copy( object.matrixWorld );


					if ( !source.closure && child.geometry ) {

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

			this.matrixWorld.copy( source.matrixWorld );


			// Re-encapsulate

			if ( this.closure && this.children.length )
				this.computeBoundingSphere();


			// Cache bounding sphere

			this.update();

		},

		update: function() {

			const object = this.source.boundingSphere ? this.source : this.geometry;

			if ( !object.boundingSphere )
				object.computeBoundingSphere();

			this.radius = this.matrixWorld.getMaxScaleOnAxis() * object.boundingSphere.radius;

			p.copy( object.boundingSphere.center ).applyMatrix4( this.matrixWorld );

			this.x = p.x;
			this.y = p.y;
			this.z = p.z;

		},

		composeMatrix: function() {


			if ( this.isChild ) {

				this.parent.restore();

				this.source.position.set( position._x, position._y, position._z );
				this.source.quaternion.set( quaternion._x, quaternion._y, quaternion._z, quaternion._w );
				this.source.scale.set( scale._x, scale._y, scale._z );

				this.parent.save();

			} else {

				if ( this.children.length ) {

					this.restore();

					this.matrixWorld.compose( position, quaternion, scale );

					this.source.position.set( position._x, position._y, position._z );
					this.source.quaternion.set( quaternion._x, quaternion._y, quaternion._z, quaternion._w );
					this.source.scale.set( scale._x, scale._y, scale._z );

					this.save();

				} else {

					this.matrixWorld.compose( position, quaternion, scale );

					this.update();

				}

			}


		},

		computeBoundingSphere: function() {

			const source = this.source;
			const sphere = source.boundingSphere || new THREE.Sphere;


			source.updateMatrix();

			matrix.copy( source.matrix );

			{

				source.position.set( 0, 0, 0 );
				source.scale.set( 1, 1, 1 );
				source.quaternion.set( 0, 0, 0, 1 );

				source.updateMatrixWorld( true );

				boundingBox.expandByObject( source );
				boundingBox.max.divideScalar( 2 );

				sphere.center.copy( boundingBox.max );
				sphere.radius = Math.sqrt( boundingBox.min.distanceToSquared( boundingBox.max ) );

			}

			matrix.decompose( source.position, source.quaternion, source.scale );

			source.updateMatrixWorld( true );


			source.boundingSphere = sphere;

		},

		setSource: function( source ) {

			this.source = source;
			this.geometry = source.geometry;
			this.material = source.material;

			if ( source.used === undefined )
				source.used = 0;

			source.used ++ ;

			if ( source.isMesh ) {

				this.isMesh = true;
				this.isSkinnedMesh = false;

				this.drawMode = source.drawMode;
				this.updateMorphTargets();

			}

			if ( source.isSkinnedMesh ) {

				this.isMesh = false;
				this.isSkinnedMesh = true;

				this.skeleton = source.skeleton;
				this.bindMatrix = source.bindMatrix;
				this.bindMatrixInverse = source.bindMatrixInverse;
				this.updateMatrixWorld = source.updateMatrixWorld;

			}



			if ( !this.isChild ) {

				// Flatten hierarchy

				if ( source.children.length  ) {

					let index = 0;
					const self = this;

					this.children = [];
					this._children = this.children;

					source.updateMatrixWorld( true );

					source.index = -1;

					source.traverse( object => {


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

				this.matrixWorld.copy( source.matrixWorld );

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

		},

		add: function() {

			console.error( "Objects can't be added to static meshes" );

		},

		remove: function() {

			console.error( "Objects can't be removed from static meshes" );

		}

	};


	let target;


	position._x = 0;
	position._y = 0;
	position._z = 0;

	Object.defineProperties( position, {

		x: {

			set: function( value ) {

				position._x = value;
				target.composeMatrix();

			},

			get: function() {

				return position._x;

			}

		},

		y: {

			set: function( value ) {

				position._y = value;
				target.composeMatrix();

			},

			get: function() {

				return position._y;

			}

		},

		z: {

			set: function( value ) {

				position._z = value;
				target.composeMatrix();

			},

			get: function() {

				return position._z;

			}

		}

	});

	scale._x = 0;
	scale._y = 0;
	scale._z = 0;

	Object.defineProperties( scale, {

		x: {

			set: function( value ) {

				this._x = value;
				target.composeMatrix();

			},

			get: function() {

				return this._x;

			}

		},

		y: {

			set: function( value ) {

				this._y = value;
				target.composeMatrix();

			},

			get: function() {

				return this._y;

			}

		},

		z: {

			set: function( value ) {

				this._z = value;
				target.composeMatrix();

			},

			get: function() {

				return this._z;

			}

		}


	});


	rotation._onChangeCallback = function() {

		quaternion.setFromEuler( rotation, false );

		if ( target )
			target.composeMatrix();

	};

	quaternion._onChangeCallback = function() {

		rotation.setFromQuaternion( quaternion, undefined, false );

		if ( target )
			target.composeMatrix();

	};


	function applyProperties( object ) {

		if ( target !== object ) {


			if ( object.isChild ) {

				const parentMatrix = ( object.parentIndex > -1 ? object.parent._children[ object.parentIndex ] : object.parent ).matrixWorld;

				matrix.getInverse( parentMatrix );
				matrix.multiply( object.matrixWorld );

			} else {

				matrix.copy( object.matrixWorld );

			}

			matrix.decompose( p, q, s );

			target = null;

			position._x = p.x;
			position._y = p.y;
			position._z = p.z;

			quaternion.x = q.x;
			quaternion.y = q.y;
			quaternion.z = q.z;
			quaternion.w = q.w;

			scale._x = s.x;
			scale._y = s.y;
			scale._z = s.z;

			target = object;

		}

		/*
		if ( position.target !== object ) {

			const te = object.matrixWorld.elements;

			position._x = te[12];
			position._y = te[13];
			position._z = te[14];

			if ( object.isChild ) {

				const te = ( object.parentIndex > -1 ? object.parent._children[ object.parentIndex ] : object.parent ).matrixWorld.elements;

				position._x -= te[12];
				position._y -= te[13];
				position._z -= te[14];

			}

			position.target = object;

		}

		if ( quaternion.target !== object ) {


			rotation.target = null;



			rotation.setFromRotationMatrix( matrix );

			quaternion.target = null;

			quaternion.x = quaternion._x;
			quaternion.y = quaternion._y;
			quaternion.z = quaternion._z;

			quaternion.target = object;

			rotation.x = rotation._x;
			rotation.y = rotation._y;
			rotation.z = rotation._z;

			rotation.target = object;

		}

		if ( quaternion.target !== object ) {

			quaternion.target = null;

			quaternion.setFromRotationMatrix( object.matrixWorld );

			rotation.target = null;

			rotation.x = rotation._x;
			rotation.y = rotation._y;
			rotation.z = rotation._z;

			rotation.target = object;

			quaternion.x = quaternion._x;
			quaternion.y = quaternion._y;
			quaternion.z = quaternion._z;

			quaternion.target = object;

		}

		if ( scale.target !== object ) {

			scale.target = null;

			const te = object.matrixWorld.elements;

			scale._x = p.set( te[ 0 ], te[ 1 ], te[ 2 ] ).length();
			scale._y = p.set( te[ 4 ], te[ 5 ], te[ 6 ] ).length();
			scale._z = p.set( te[ 8 ], te[ 9 ], te[ 10 ] ).length();

			const det = object.matrixWorld.determinant();
			if ( det < 0 ) scale.x = - scale.x;

			scale.target = object;

		}*/

	}

	Object.defineProperties( THREE.StaticMesh.prototype, {

		position: {

			get: function() {

				applyProperties( this );

				return position;

			}

		},

		rotation: {

			get: function() {

				applyProperties( this );

				return rotation;

			}

		},

		quaternion: {

			get: function() {

				applyProperties( this );

				return quaternion;

			}

		},

		scale: {

			get: function() {

				applyProperties( this );

				return scale;

			}

		}

	});



	THREE.Mesh.prototype.toStatic = function() {

		return new THREE.StaticMesh( this );

	};


}());
