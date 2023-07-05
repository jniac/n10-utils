export const glsl_qtUtils = /* glsl */`

vec4 qtFromTo(vec3 a, vec3 b) {
	vec4 q;
	q.xyz = cross(a, b);
	q.w = dot(a, a) * dot(b, b) + dot(a, b);
	return q;
}

vec3 qtTransform(vec4 q, vec3 v) {
	return v + 2.0 * cross(cross(v, q.xyz) + q.w * v, q.xyz);
}
`;
