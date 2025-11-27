export function mapRoleToMidi(role, gyro, intensity, tap) {
  switch (role) {
    case "vent":
      return {
        cc10: gyro.x,
        cc74: gyro.y,
        volume: intensity,
      };
    case "eau":
      return {
        cc21: gyro.y,
        cc22: gyro.x,
        tap: tap ? 1 : 0,
      };
    case "foret":
      return {
        cc33: gyro.z,
        cc34: gyro.x,
        volume: intensity,
      };
    case "feu":
      return {
        cc45: gyro.x,
        cc46: gyro.y,
        volume: intensity,
      };
    case "oiseaux":
      return {
        cc57: gyro.y,
        cc58: gyro.z,
        tap: tap ? 1 : 0,
      };
    case "tonnerre":
      return {
        cc69: gyro.z,
        cc70: gyro.y,
        volume: intensity,
      };
    default:
      return null;
  }
}
