// three-extras.js — r128 example addons (MIT). Load AFTER three-bloom.js (needs THREE.Pass).
// Bundled: BokehShader, BokehPass (DoF), Reflector (planar mirror / wet-road reflections).
( function () {

	/**
 * Depth-of-field shader with bokeh
 * ported from GLSL shader by Martins Upitis
 * http://artmartinsh.blogspot.com/2010/02/glsl-lens-blur-filter-with-bokeh.html
 */
	const BokehShader = {
		defines: {
			'DEPTH_PACKING': 1,
			'PERSPECTIVE_CAMERA': 1
		},
		uniforms: {
			'tColor': {
				value: null
			},
			'tDepth': {
				value: null
			},
			'focus': {
				value: 1.0
			},
			'aspect': {
				value: 1.0
			},
			'aperture': {
				value: 0.025
			},
			'maxblur': {
				value: 0.01
			},
			'nearClip': {
				value: 1.0
			},
			'farClip': {
				value: 1000.0
			}
		},
		vertexShader:
  /* glsl */
  `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `

		#include <common>

		varying vec2 vUv;

		uniform sampler2D tColor;
		uniform sampler2D tDepth;

		uniform float maxblur; // max blur amount
		uniform float aperture; // aperture - bigger values for shallower depth of field

		uniform float nearClip;
		uniform float farClip;

		uniform float focus;
		uniform float aspect;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, nearClip, farClip );
			#else
			return orthographicDepthToViewZ( depth, nearClip, farClip );
			#endif
		}


		void main() {

			vec2 aspectcorrect = vec2( 1.0, aspect );

			float viewZ = getViewZ( getDepth( vUv ) );

			float factor = ( focus + viewZ ); // viewZ is <= 0, so this is a difference equation

			vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );

			vec2 dofblur9 = dofblur * 0.9;
			vec2 dofblur7 = dofblur * 0.7;
			vec2 dofblur4 = dofblur * 0.4;

			vec4 col = vec4( 0.0 );

			col += texture2D( tColor, vUv.xy );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );

			gl_FragColor = col / 41.0;
			gl_FragColor.a = 1.0;

		}`
	};

	THREE.BokehShader = BokehShader;

} )();
( function () {

	/**
 * Depth-of-field post-process with bokeh shader
 */

	class BokehPass extends THREE.Pass {

		constructor( scene, camera, params ) {

			super();
			this.scene = scene;
			this.camera = camera;
			const focus = params.focus !== undefined ? params.focus : 1.0;
			const aspect = params.aspect !== undefined ? params.aspect : camera.aspect;
			const aperture = params.aperture !== undefined ? params.aperture : 0.025;
			const maxblur = params.maxblur !== undefined ? params.maxblur : 1.0; // render targets

			const width = params.width || window.innerWidth || 1;
			const height = params.height || window.innerHeight || 1;
			this.renderTargetDepth = new THREE.WebGLRenderTarget( width, height, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter
			} );
			this.renderTargetDepth.texture.name = 'BokehPass.depth'; // depth material

			this.materialDepth = new THREE.MeshDepthMaterial();
			this.materialDepth.depthPacking = THREE.RGBADepthPacking;
			this.materialDepth.blending = THREE.NoBlending; // bokeh material

			if ( THREE.BokehShader === undefined ) {

				console.error( 'THREE.BokehPass relies on THREE.BokehShader' );

			}

			const bokehShader = THREE.BokehShader;
			const bokehUniforms = THREE.UniformsUtils.clone( bokehShader.uniforms );
			bokehUniforms[ 'tDepth' ].value = this.renderTargetDepth.texture;
			bokehUniforms[ 'focus' ].value = focus;
			bokehUniforms[ 'aspect' ].value = aspect;
			bokehUniforms[ 'aperture' ].value = aperture;
			bokehUniforms[ 'maxblur' ].value = maxblur;
			bokehUniforms[ 'nearClip' ].value = camera.near;
			bokehUniforms[ 'farClip' ].value = camera.far;
			this.materialBokeh = new THREE.ShaderMaterial( {
				defines: Object.assign( {}, bokehShader.defines ),
				uniforms: bokehUniforms,
				vertexShader: bokehShader.vertexShader,
				fragmentShader: bokehShader.fragmentShader
			} );
			this.uniforms = bokehUniforms;
			this.needsSwap = false;
			this.fsQuad = new THREE.FullScreenQuad( this.materialBokeh );
			this._oldClearColor = new THREE.Color();

		}

		render( renderer, writeBuffer, readBuffer
			/*, deltaTime, maskActive*/
		) {

			// Render depth into texture
			this.scene.overrideMaterial = this.materialDepth;
			renderer.getClearColor( this._oldClearColor );
			const oldClearAlpha = renderer.getClearAlpha();
			const oldAutoClear = renderer.autoClear;
			renderer.autoClear = false;
			renderer.setClearColor( 0xffffff );
			renderer.setClearAlpha( 1.0 );
			renderer.setRenderTarget( this.renderTargetDepth );
			renderer.clear();
			renderer.render( this.scene, this.camera ); // Render bokeh composite

			this.uniforms[ 'tColor' ].value = readBuffer.texture;
			this.uniforms[ 'nearClip' ].value = this.camera.near;
			this.uniforms[ 'farClip' ].value = this.camera.far;

			if ( this.renderToScreen ) {

				renderer.setRenderTarget( null );
				this.fsQuad.render( renderer );

			} else {

				renderer.setRenderTarget( writeBuffer );
				renderer.clear();
				this.fsQuad.render( renderer );

			}

			this.scene.overrideMaterial = null;
			renderer.setClearColor( this._oldClearColor );
			renderer.setClearAlpha( oldClearAlpha );
			renderer.autoClear = oldAutoClear;

		}

	}

	THREE.BokehPass = BokehPass;

} )();
( function () {

	class Reflector extends THREE.Mesh {

		constructor( geometry, options = {} ) {

			super( geometry );
			this.type = 'Reflector';
			const scope = this;
			const color = options.color !== undefined ? new THREE.Color( options.color ) : new THREE.Color( 0x7F7F7F );
			const textureWidth = options.textureWidth || 512;
			const textureHeight = options.textureHeight || 512;
			const clipBias = options.clipBias || 0;
			const shader = options.shader || Reflector.ReflectorShader; //

			const reflectorPlane = new THREE.Plane();
			const normal = new THREE.Vector3();
			const reflectorWorldPosition = new THREE.Vector3();
			const cameraWorldPosition = new THREE.Vector3();
			const rotationMatrix = new THREE.Matrix4();
			const lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
			const clipPlane = new THREE.Vector4();
			const view = new THREE.Vector3();
			const target = new THREE.Vector3();
			const q = new THREE.Vector4();
			const textureMatrix = new THREE.Matrix4();
			const virtualCamera = new THREE.PerspectiveCamera();
			const parameters = {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBFormat
			};
			const renderTarget = new THREE.WebGLRenderTarget( textureWidth, textureHeight, parameters );

			if ( ! THREE.MathUtils.isPowerOfTwo( textureWidth ) || ! THREE.MathUtils.isPowerOfTwo( textureHeight ) ) {

				renderTarget.texture.generateMipmaps = false;

			}

			const material = new THREE.ShaderMaterial( {
				uniforms: THREE.UniformsUtils.clone( shader.uniforms ),
				fragmentShader: shader.fragmentShader,
				vertexShader: shader.vertexShader
			} );
			material.uniforms[ 'tDiffuse' ].value = renderTarget.texture;
			material.uniforms[ 'color' ].value = color;
			material.uniforms[ 'textureMatrix' ].value = textureMatrix;
			this.material = material;

			this.onBeforeRender = function ( renderer, scene, camera ) {

				reflectorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
				cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );
				rotationMatrix.extractRotation( scope.matrixWorld );
				normal.set( 0, 0, 1 );
				normal.applyMatrix4( rotationMatrix );
				view.subVectors( reflectorWorldPosition, cameraWorldPosition ); // Avoid rendering when reflector is facing away

				if ( view.dot( normal ) > 0 ) return;
				view.reflect( normal ).negate();
				view.add( reflectorWorldPosition );
				rotationMatrix.extractRotation( camera.matrixWorld );
				lookAtPosition.set( 0, 0, - 1 );
				lookAtPosition.applyMatrix4( rotationMatrix );
				lookAtPosition.add( cameraWorldPosition );
				target.subVectors( reflectorWorldPosition, lookAtPosition );
				target.reflect( normal ).negate();
				target.add( reflectorWorldPosition );
				virtualCamera.position.copy( view );
				virtualCamera.up.set( 0, 1, 0 );
				virtualCamera.up.applyMatrix4( rotationMatrix );
				virtualCamera.up.reflect( normal );
				virtualCamera.lookAt( target );
				virtualCamera.far = camera.far; // Used in WebGLBackground

				virtualCamera.updateMatrixWorld();
				virtualCamera.projectionMatrix.copy( camera.projectionMatrix ); // Update the texture matrix

				textureMatrix.set( 0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0 );
				textureMatrix.multiply( virtualCamera.projectionMatrix );
				textureMatrix.multiply( virtualCamera.matrixWorldInverse );
				textureMatrix.multiply( scope.matrixWorld ); // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
				// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf

				reflectorPlane.setFromNormalAndCoplanarPoint( normal, reflectorWorldPosition );
				reflectorPlane.applyMatrix4( virtualCamera.matrixWorldInverse );
				clipPlane.set( reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant );
				const projectionMatrix = virtualCamera.projectionMatrix;
				q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
				q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
				q.z = - 1.0;
				q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ]; // Calculate the scaled plane vector

				clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) ); // Replacing the third row of the projection matrix

				projectionMatrix.elements[ 2 ] = clipPlane.x;
				projectionMatrix.elements[ 6 ] = clipPlane.y;
				projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
				projectionMatrix.elements[ 14 ] = clipPlane.w; // Render

				renderTarget.texture.encoding = renderer.outputEncoding;
				scope.visible = false;
				const currentRenderTarget = renderer.getRenderTarget();
				const currentXrEnabled = renderer.xr.enabled;
				const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
				renderer.xr.enabled = false; // Avoid camera modification

				renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

				renderer.setRenderTarget( renderTarget );
				renderer.state.buffers.depth.setMask( true ); // make sure the depth buffer is writable so it can be properly cleared, see #18897

				if ( renderer.autoClear === false ) renderer.clear();
				renderer.render( scene, virtualCamera );
				renderer.xr.enabled = currentXrEnabled;
				renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
				renderer.setRenderTarget( currentRenderTarget ); // Restore viewport

				const viewport = camera.viewport;

				if ( viewport !== undefined ) {

					renderer.state.viewport( viewport );

				}

				scope.visible = true;

			};

			this.getRenderTarget = function () {

				return renderTarget;

			};

		}

	}

	Reflector.prototype.isReflector = true;
	Reflector.ReflectorShader = {
		uniforms: {
			'color': {
				value: null
			},
			'tDiffuse': {
				value: null
			},
			'textureMatrix': {
				value: null
			}
		},
		vertexShader:
  /* glsl */
  `
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

		}`
	};

	THREE.Reflector = Reflector;

} )();

( function () {

	// http://en.wikipedia.org/wiki/RGBE_image_format

	class RGBELoader extends THREE.DataTextureLoader {

		constructor( manager ) {

			super( manager );
			this.type = THREE.UnsignedByteType;

		} // adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html


		parse( buffer ) {

			const
				/* return codes for rgbe routines */
				//RGBE_RETURN_SUCCESS = 0,
				RGBE_RETURN_FAILURE = - 1,

				/* default error routine.  change this to change error handling */
				rgbe_read_error = 1,
				rgbe_write_error = 2,
				rgbe_format_error = 3,
				rgbe_memory_error = 4,
				rgbe_error = function ( rgbe_error_code, msg ) {

					switch ( rgbe_error_code ) {

						case rgbe_read_error:
							console.error( 'THREE.RGBELoader Read Error: ' + ( msg || '' ) );
							break;

						case rgbe_write_error:
							console.error( 'THREE.RGBELoader Write Error: ' + ( msg || '' ) );
							break;

						case rgbe_format_error:
							console.error( 'THREE.RGBELoader Bad File Format: ' + ( msg || '' ) );
							break;

						default:
						case rgbe_memory_error:
							console.error( 'THREE.RGBELoader: Error: ' + ( msg || '' ) );

					}

					return RGBE_RETURN_FAILURE;

				},

				/* offsets to red, green, and blue components in a data (float) pixel */
				//RGBE_DATA_RED = 0,
				//RGBE_DATA_GREEN = 1,
				//RGBE_DATA_BLUE = 2,

				/* number of floats per pixel, use 4 since stored in rgba image format */
				//RGBE_DATA_SIZE = 4,

				/* flags indicating which fields in an rgbe_header_info are valid */
				RGBE_VALID_PROGRAMTYPE = 1,
				RGBE_VALID_FORMAT = 2,
				RGBE_VALID_DIMENSIONS = 4,
				NEWLINE = '\n',
				fgets = function ( buffer, lineLimit, consume ) {

					const chunkSize = 128;
					lineLimit = ! lineLimit ? 1024 : lineLimit;
					let p = buffer.pos,
						i = - 1,
						len = 0,
						s = '',
						chunk = String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

					while ( 0 > ( i = chunk.indexOf( NEWLINE ) ) && len < lineLimit && p < buffer.byteLength ) {

						s += chunk;
						len += chunk.length;
						p += chunkSize;
						chunk += String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

					}

					if ( - 1 < i ) {

						/*for (i=l-1; i>=0; i--) {
        	byteCode = m.charCodeAt(i);
        	if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
        	else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
        	if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
        }*/
						if ( false !== consume ) buffer.pos += len + i + 1;
						return s + chunk.slice( 0, i );

					}

					return false;

				},

				/* minimal header reading.  modify if you want to parse more information */
				RGBE_ReadHeader = function ( buffer ) {

					// regexes to parse header info fields
					const magic_token_re = /^#\?(\S+)/,
						gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
						exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
						format_re = /^\s*FORMAT=(\S+)\s*$/,
						dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,
						// RGBE format header struct
						header = {
							valid: 0,

							/* indicate which fields are valid */
							string: '',

							/* the actual header string */
							comments: '',

							/* comments found in header */
							programtype: 'RGBE',

							/* listed at beginning of file to identify it after "#?". defaults to "RGBE" */
							format: '',

							/* RGBE format, default 32-bit_rle_rgbe */
							gamma: 1.0,

							/* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */
							exposure: 1.0,

							/* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */
							width: 0,
							height: 0
							/* image dimensions, width/height */

						};
					let line, match;

					if ( buffer.pos >= buffer.byteLength || ! ( line = fgets( buffer ) ) ) {

						return rgbe_error( rgbe_read_error, 'no header found' );

					}
					/* if you want to require the magic token then uncomment the next line */


					if ( ! ( match = line.match( magic_token_re ) ) ) {

						return rgbe_error( rgbe_format_error, 'bad initial token' );

					}

					header.valid |= RGBE_VALID_PROGRAMTYPE;
					header.programtype = match[ 1 ];
					header.string += line + '\n';

					while ( true ) {

						line = fgets( buffer );
						if ( false === line ) break;
						header.string += line + '\n';

						if ( '#' === line.charAt( 0 ) ) {

							header.comments += line + '\n';
							continue; // comment line

						}

						if ( match = line.match( gamma_re ) ) {

							header.gamma = parseFloat( match[ 1 ], 10 );

						}

						if ( match = line.match( exposure_re ) ) {

							header.exposure = parseFloat( match[ 1 ], 10 );

						}

						if ( match = line.match( format_re ) ) {

							header.valid |= RGBE_VALID_FORMAT;
							header.format = match[ 1 ]; //'32-bit_rle_rgbe';

						}

						if ( match = line.match( dimensions_re ) ) {

							header.valid |= RGBE_VALID_DIMENSIONS;
							header.height = parseInt( match[ 1 ], 10 );
							header.width = parseInt( match[ 2 ], 10 );

						}

						if ( header.valid & RGBE_VALID_FORMAT && header.valid & RGBE_VALID_DIMENSIONS ) break;

					}

					if ( ! ( header.valid & RGBE_VALID_FORMAT ) ) {

						return rgbe_error( rgbe_format_error, 'missing format specifier' );

					}

					if ( ! ( header.valid & RGBE_VALID_DIMENSIONS ) ) {

						return rgbe_error( rgbe_format_error, 'missing image size specifier' );

					}

					return header;

				},
				RGBE_ReadPixels_RLE = function ( buffer, w, h ) {

					const scanline_width = w;

					if ( // run length encoding is not allowed so read flat
						scanline_width < 8 || scanline_width > 0x7fff || // this file is not run length encoded
      2 !== buffer[ 0 ] || 2 !== buffer[ 1 ] || buffer[ 2 ] & 0x80 ) {

						// return the flat buffer
						return new Uint8Array( buffer );

					}

					if ( scanline_width !== ( buffer[ 2 ] << 8 | buffer[ 3 ] ) ) {

						return rgbe_error( rgbe_format_error, 'wrong scanline width' );

					}

					const data_rgba = new Uint8Array( 4 * w * h );

					if ( ! data_rgba.length ) {

						return rgbe_error( rgbe_memory_error, 'unable to allocate buffer space' );

					}

					let offset = 0,
						pos = 0;
					const ptr_end = 4 * scanline_width;
					const rgbeStart = new Uint8Array( 4 );
					const scanline_buffer = new Uint8Array( ptr_end );
					let num_scanlines = h; // read in each successive scanline

					while ( num_scanlines > 0 && pos < buffer.byteLength ) {

						if ( pos + 4 > buffer.byteLength ) {

							return rgbe_error( rgbe_read_error );

						}

						rgbeStart[ 0 ] = buffer[ pos ++ ];
						rgbeStart[ 1 ] = buffer[ pos ++ ];
						rgbeStart[ 2 ] = buffer[ pos ++ ];
						rgbeStart[ 3 ] = buffer[ pos ++ ];

						if ( 2 != rgbeStart[ 0 ] || 2 != rgbeStart[ 1 ] || ( rgbeStart[ 2 ] << 8 | rgbeStart[ 3 ] ) != scanline_width ) {

							return rgbe_error( rgbe_format_error, 'bad rgbe scanline format' );

						} // read each of the four channels for the scanline into the buffer
						// first red, then green, then blue, then exponent


						let ptr = 0,
							count;

						while ( ptr < ptr_end && pos < buffer.byteLength ) {

							count = buffer[ pos ++ ];
							const isEncodedRun = count > 128;
							if ( isEncodedRun ) count -= 128;

							if ( 0 === count || ptr + count > ptr_end ) {

								return rgbe_error( rgbe_format_error, 'bad scanline data' );

							}

							if ( isEncodedRun ) {

								// a (encoded) run of the same value
								const byteValue = buffer[ pos ++ ];

								for ( let i = 0; i < count; i ++ ) {

									scanline_buffer[ ptr ++ ] = byteValue;

								} //ptr += count;

							} else {

								// a literal-run
								scanline_buffer.set( buffer.subarray( pos, pos + count ), ptr );
								ptr += count;
								pos += count;

							}

						} // now convert data from buffer into rgba
						// first red, then green, then blue, then exponent (alpha)


						const l = scanline_width; //scanline_buffer.byteLength;

						for ( let i = 0; i < l; i ++ ) {

							let off = 0;
							data_rgba[ offset ] = scanline_buffer[ i + off ];
							off += scanline_width; //1;

							data_rgba[ offset + 1 ] = scanline_buffer[ i + off ];
							off += scanline_width; //1;

							data_rgba[ offset + 2 ] = scanline_buffer[ i + off ];
							off += scanline_width; //1;

							data_rgba[ offset + 3 ] = scanline_buffer[ i + off ];
							offset += 4;

						}

						num_scanlines --;

					}

					return data_rgba;

				};

			const RGBEByteToRGBFloat = function ( sourceArray, sourceOffset, destArray, destOffset ) {

				const e = sourceArray[ sourceOffset + 3 ];
				const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;
				destArray[ destOffset + 0 ] = sourceArray[ sourceOffset + 0 ] * scale;
				destArray[ destOffset + 1 ] = sourceArray[ sourceOffset + 1 ] * scale;
				destArray[ destOffset + 2 ] = sourceArray[ sourceOffset + 2 ] * scale;

			};

			const RGBEByteToRGBHalf = function ( sourceArray, sourceOffset, destArray, destOffset ) {

				const e = sourceArray[ sourceOffset + 3 ];
				const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;
				destArray[ destOffset + 0 ] = THREE.DataUtils.toHalfFloat( sourceArray[ sourceOffset + 0 ] * scale );
				destArray[ destOffset + 1 ] = THREE.DataUtils.toHalfFloat( sourceArray[ sourceOffset + 1 ] * scale );
				destArray[ destOffset + 2 ] = THREE.DataUtils.toHalfFloat( sourceArray[ sourceOffset + 2 ] * scale );

			};

			const byteArray = new Uint8Array( buffer );
			byteArray.pos = 0;
			const rgbe_header_info = RGBE_ReadHeader( byteArray );

			if ( RGBE_RETURN_FAILURE !== rgbe_header_info ) {

				const w = rgbe_header_info.width,
					h = rgbe_header_info.height,
					image_rgba_data = RGBE_ReadPixels_RLE( byteArray.subarray( byteArray.pos ), w, h );

				if ( RGBE_RETURN_FAILURE !== image_rgba_data ) {

					let data, format, type;
					let numElements;

					switch ( this.type ) {

						case THREE.UnsignedByteType:
							data = image_rgba_data;
							format = THREE.RGBEFormat; // handled as THREE.RGBAFormat in shaders

							type = THREE.UnsignedByteType;
							break;

						case THREE.FloatType:
							numElements = image_rgba_data.length / 4 * 3;
							const floatArray = new Float32Array( numElements );

							for ( let j = 0; j < numElements; j ++ ) {

								RGBEByteToRGBFloat( image_rgba_data, j * 4, floatArray, j * 3 );

							}

							data = floatArray;
							format = THREE.RGBFormat;
							type = THREE.FloatType;
							break;

						case THREE.HalfFloatType:
							numElements = image_rgba_data.length / 4 * 3;
							const halfArray = new Uint16Array( numElements );

							for ( let j = 0; j < numElements; j ++ ) {

								RGBEByteToRGBHalf( image_rgba_data, j * 4, halfArray, j * 3 );

							}

							data = halfArray;
							format = THREE.RGBFormat;
							type = THREE.HalfFloatType;
							break;

						default:
							console.error( 'THREE.RGBELoader: unsupported type: ', this.type );
							break;

					}

					return {
						width: w,
						height: h,
						data: data,
						header: rgbe_header_info.string,
						gamma: rgbe_header_info.gamma,
						exposure: rgbe_header_info.exposure,
						format: format,
						type: type
					};

				}

			}

			return null;

		}

		setDataType( value ) {

			this.type = value;
			return this;

		}

		load( url, onLoad, onProgress, onError ) {

			function onLoadCallback( texture, texData ) {

				switch ( texture.type ) {

					case THREE.UnsignedByteType:
						texture.encoding = THREE.RGBEEncoding;
						texture.minFilter = THREE.NearestFilter;
						texture.magFilter = THREE.NearestFilter;
						texture.generateMipmaps = false;
						texture.flipY = true;
						break;

					case THREE.FloatType:
						texture.encoding = THREE.LinearEncoding;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						texture.generateMipmaps = false;
						texture.flipY = true;
						break;

					case THREE.HalfFloatType:
						texture.encoding = THREE.LinearEncoding;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						texture.generateMipmaps = false;
						texture.flipY = true;
						break;

				}

				if ( onLoad ) onLoad( texture, texData );

			}

			return super.load( url, onLoadCallback, onProgress, onError );

		}

	}

	THREE.RGBELoader = RGBELoader;

} )();
