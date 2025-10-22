// Test des fonctions helpers
const getPropertyIcon = (typeBien) => {
  const type = typeBien?.toUpperCase() || '';
  if (type.includes('TERRAIN')) return '🌳';
  if (type.includes('PARKING') || type.includes('GARAGE') || type.includes('BOX')) return '🚗';
  if (type.includes('MAISON') || type.includes('VILLA')) return '🏠';
  if (type.includes('APPARTEMENT')) return '🏢';
  return '🏘️';
};

console.log('Test TERRAIN:', getPropertyIcon('TERRAIN'));
console.log('Test MAISON:', getPropertyIcon('MAISON'));
console.log('Test APPARTEMENT:', getPropertyIcon('APPARTEMENT'));
console.log('Test PARKING:', getPropertyIcon('PARKING'));
