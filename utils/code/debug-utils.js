export function getDeclaredUniforms(gl, program) {
  // get the number of active uniforms
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  const uniforms = {};
  
  for (let i = 0; i < uniformCount; i++) {
    // retrieve information about each uniform
    const uniformInfo = gl.getActiveUniform(program, i);
    if (uniformInfo) {
      const name = uniformInfo.name;
      
      // for arrays, the name returned by getActiveUniform is suffixed with "[0]".
      // use the base name to get the main location.
      const baseName = name.endsWith('[0]') ? name.slice(0, -3) : name;
      
      // get the location of the uniform variable
      const location = gl.getUniformLocation(program, baseName);
      
      if (location) {
        // store the name and location
        uniforms[baseName] = location;
      }
    }
  }
  
  return uniforms;
}