export const glsl_makeRotationMat3 = /* glsl */`
mat3 makeRotationMat3(float x, float y, float z) {
	float cx = cos(x);
	float cy = cos(y);
	float cz = cos(z);
	float sx = sin(x);
	float sy = sin(y);
	float sz = sin(z);
	return mat3(
		vec3(cy * cz, cz * sx * sy - cx * sz, sx * sz + cx * cz * sy),
		vec3(cy * sz, cx * cz + sx * sy * sz, -cz * sx + cx * sy * sz),
		vec3(-sy, cy * sx, cx * cy));
}
mat3 makeRotationMat3(vec3 euler) {
	return makeRotationMat3(euler.x, euler.y, euler.z);
}
`;
