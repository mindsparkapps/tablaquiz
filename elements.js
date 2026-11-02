// Los 118 elementos: número, símbolo, nombre, masa atómica. Categoría y posición se calculan.
const RAW = `H|Hidrógeno|1.008
He|Helio|4.0026
Li|Litio|6.94
Be|Berilio|9.0122
B|Boro|10.81
C|Carbono|12.011
N|Nitrógeno|14.007
O|Oxígeno|15.999
F|Flúor|18.998
Ne|Neón|20.180
Na|Sodio|22.990
Mg|Magnesio|24.305
Al|Aluminio|26.982
Si|Silicio|28.085
P|Fósforo|30.974
S|Azufre|32.06
Cl|Cloro|35.45
Ar|Argón|39.948
K|Potasio|39.098
Ca|Calcio|40.078
Sc|Escandio|44.956
Ti|Titanio|47.867
V|Vanadio|50.942
Cr|Cromo|51.996
Mn|Manganeso|54.938
Fe|Hierro|55.845
Co|Cobalto|58.933
Ni|Níquel|58.693
Cu|Cobre|63.546
Zn|Zinc|65.38
Ga|Galio|69.723
Ge|Germanio|72.630
As|Arsénico|74.922
Se|Selenio|78.971
Br|Bromo|79.904
Kr|Kriptón|83.798
Rb|Rubidio|85.468
Sr|Estroncio|87.62
Y|Itrio|88.906
Zr|Circonio|91.224
Nb|Niobio|92.906
Mo|Molibdeno|95.95
Tc|Tecnecio|[98]
Ru|Rutenio|101.07
Rh|Rodio|102.91
Pd|Paladio|106.42
Ag|Plata|107.87
Cd|Cadmio|112.41
In|Indio|114.82
Sn|Estaño|118.71
Sb|Antimonio|121.76
Te|Telurio|127.60
I|Yodo|126.90
Xe|Xenón|131.29
Cs|Cesio|132.91
Ba|Bario|137.33
La|Lantano|138.91
Ce|Cerio|140.12
Pr|Praseodimio|140.91
Nd|Neodimio|144.24
Pm|Prometio|[145]
Sm|Samario|150.36
Eu|Europio|151.96
Gd|Gadolinio|157.25
Tb|Terbio|158.93
Dy|Disprosio|162.50
Ho|Holmio|164.93
Er|Erbio|167.26
Tm|Tulio|168.93
Yb|Iterbio|173.05
Lu|Lutecio|174.97
Hf|Hafnio|178.49
Ta|Tántalo|180.95
W|Wolframio|183.84
Re|Renio|186.21
Os|Osmio|190.23
Ir|Iridio|192.22
Pt|Platino|195.08
Au|Oro|196.97
Hg|Mercurio|200.59
Tl|Talio|204.38
Pb|Plomo|207.2
Bi|Bismuto|208.98
Po|Polonio|[209]
At|Astato|[210]
Rn|Radón|[222]
Fr|Francio|[223]
Ra|Radio|[226]
Ac|Actinio|[227]
Th|Torio|232.04
Pa|Protactinio|231.04
U|Uranio|238.03
Np|Neptunio|[237]
Pu|Plutonio|[244]
Am|Americio|[243]
Cm|Curio|[247]
Bk|Berkelio|[247]
Cf|Californio|[251]
Es|Einstenio|[252]
Fm|Fermio|[257]
Md|Mendelevio|[258]
No|Nobelio|[259]
Lr|Lawrencio|[266]
Rf|Rutherfordio|[267]
Db|Dubnio|[268]
Sg|Seaborgio|[269]
Bh|Bohrio|[270]
Hs|Hasio|[277]
Mt|Meitnerio|[278]
Ds|Darmstadtio|[281]
Rg|Roentgenio|[282]
Cn|Copernicio|[285]
Nh|Nihonio|[286]
Fl|Flerovio|[289]
Mc|Moscovio|[290]
Lv|Livermorio|[293]
Ts|Teneso|[294]
Og|Oganesón|[294]`;

const CATEGORIAS = {
  alcalino:   { nombre: 'Alcalinos' },
  alcalinoter:{ nombre: 'Alcalinotérreos' },
  transicion: { nombre: 'Metales de transición' },
  postrans:   { nombre: 'Otros metales' },
  metaloide:  { nombre: 'Metaloides' },
  nometal:    { nombre: 'No metales' },
  halogeno:   { nombre: 'Halógenos' },
  noble:      { nombre: 'Gases nobles' },
  lantanido:  { nombre: 'Lantánidos' },
  actinido:   { nombre: 'Actínidos' }
};

function categoriaDe(z) {
  const en = (...l) => l.includes(z);
  if (en(3, 11, 19, 37, 55, 87)) return 'alcalino';
  if (en(4, 12, 20, 38, 56, 88)) return 'alcalinoter';
  if (z >= 57 && z <= 71) return 'lantanido';
  if (z >= 89 && z <= 103) return 'actinido';
  if (en(9, 17, 35, 53, 85, 117)) return 'halogeno';
  if (en(2, 10, 18, 36, 54, 86, 118)) return 'noble';
  if (en(5, 14, 32, 33, 51, 52)) return 'metaloide';
  if (en(1, 6, 7, 8, 15, 16, 34)) return 'nometal';
  if (en(13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116)) return 'postrans';
  return 'transicion';
}

// Posición en la tabla: fila y columna (los lantánidos y actínidos van en las filas 9 y 10).
function posicionDe(z) {
  if (z === 1) return [1, 1];
  if (z === 2) return [1, 18];
  const tramos = [[3, 4, 2], [11, 12, 3], [19, 36, 4], [37, 54, 5], [55, 56, 6], [87, 88, 7]];
  for (const [a, b, fila] of tramos) if (z >= a && z <= b) return [fila, z - a + 1];
  if (z >= 5 && z <= 10) return [2, z + 8];
  if (z >= 13 && z <= 18) return [3, z];
  if (z >= 57 && z <= 71) return [9, z - 54];
  if (z >= 89 && z <= 103) return [10, z - 86];
  if (z >= 72 && z <= 86) return [6, z - 68];
  return [7, z - 100]; // 104-118
}

const ELEMENTOS = RAW.split('\n').map((l, i) => {
  const [simbolo, nombre, masa] = l.split('|');
  const z = i + 1;
  const [fila, col] = posicionDe(z);
  return { z, simbolo, nombre, masa, cat: categoriaDe(z), fila, col };
});

// Periodo y grupo "reales" para la ficha del elemento.
for (const e of ELEMENTOS) {
  e.periodo = e.fila <= 7 ? e.fila : (e.fila === 9 ? 6 : 7);
  e.grupo = (e.cat === 'lantanido' || e.cat === 'actinido') ? null : e.col;
}
