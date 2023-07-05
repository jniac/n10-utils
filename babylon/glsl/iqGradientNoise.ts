/**
 * https://www.shadertoy.com/view/Xsl3Dl
 */
export const glsl_iqGradientNoise = /* glsl */`
vec3 iqGradientNoise_hash( vec3 p ) // replace this by something better
{
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

// Returns a float in range (-1, 1)
float iqGradientNoise( in vec3 p )
{
    vec3 i = floor( p );
    vec3 f = fract( p );

	vec3 u = f*f*(3.0-2.0*f);

    return mix( mix( mix( dot( iqGradientNoise_hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ),
                          dot( iqGradientNoise_hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( iqGradientNoise_hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ),
                          dot( iqGradientNoise_hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( iqGradientNoise_hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ),
                          dot( iqGradientNoise_hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( iqGradientNoise_hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ),
                          dot( iqGradientNoise_hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}
`;
