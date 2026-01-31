// lib/cities-to-countries.ts
// Mapping of major cities to their countries for search functionality

export const CITY_TO_COUNTRY: Record<string, string> = {
  // United Kingdom / Scotland / England / Wales
  edinburgh: "Scotland",
  glasgow: "Scotland",
  aberdeen: "Scotland",
  dundee: "Scotland",
  inverness: "Scotland",
  stirling: "Scotland",
  london: "England",
  manchester: "England",
  birmingham: "England",
  liverpool: "England",
  leeds: "England",
  sheffield: "England",
  bristol: "England",
  cardiff: "Wales",
  swansea: "Wales",
  belfast: "Northern Ireland",
  
  // United States
  "new york": "United States",
  "los angeles": "United States",
  chicago: "United States",
  houston: "United States",
  phoenix: "United States",
  philadelphia: "United States",
  "san antonio": "United States",
  "san diego": "United States",
  dallas: "United States",
  "san jose": "United States",
  austin: "United States",
  jacksonville: "United States",
  miami: "United States",
  boston: "United States",
  seattle: "United States",
  denver: "United States",
  washington: "United States",
  "las vegas": "United States",
  atlanta: "United States",
  detroit: "United States",
  portland: "United States",
  memphis: "United States",
  baltimore: "United States",
  milwaukee: "United States",
  omaha: "United States",
  minneapolis: "United States",
  tulsa: "United States",
  cleveland: "United States",
  wichita: "United States",
  tampa: "United States",
  bakersfield: "United States",
  oakland: "United States",
  "new orleans": "United States",
  honolulu: "United States",
  
  // Canada
  toronto: "Canada",
  montreal: "Canada",
  vancouver: "Canada",
  calgary: "Canada",
  edmonton: "Canada",
  ottawa: "Canada",
  winnipeg: "Canada",
  quebec: "Canada",
  kitchener: "Canada",
  
  // Australia
  sydney: "Australia",
  melbourne: "Australia",
  brisbane: "Australia",
  perth: "Australia",
  adelaide: "Australia",
  "gold coast": "Australia",
  newcastle: "Australia",
  canberra: "Australia",
  hobart: "Australia",
  darwin: "Australia",
  
  // Ireland
  dublin: "Ireland",
  cork: "Ireland",
  limerick: "Ireland",
  galway: "Ireland",
  waterford: "Ireland",
  dundalk: "Ireland",
  
  // Germany
  berlin: "Germany",
  munich: "Germany",
  hamburg: "Germany",
  cologne: "Germany",
  frankfurt: "Germany",
  stuttgart: "Germany",
  dortmund: "Germany",
  essen: "Germany",
  leipzig: "Germany",
  bremen: "Germany",
  dresden: "Germany",
  hannover: "Germany",
  nuremberg: "Germany",
  duisburg: "Germany",
  bochum: "Germany",
  wuppertal: "Germany",
  bielefeld: "Germany",
  bonn: "Germany",
  münster: "Germany",
  karlsruhe: "Germany",
  
  // France
  paris: "France",
  marseille: "France",
  lyon: "France",
  toulouse: "France",
  nice: "France",
  nantes: "France",
  strasbourg: "France",
  montpellier: "France",
  bordeaux: "France",
  lille: "France",
  rennes: "France",
  reims: "France",
  "le havre": "France",
  "saint étienne": "France",
  toulon: "France",
  grenoble: "France",
  dijon: "France",
  angers: "France",
  nîmes: "France",
  villeurbanne: "France",
  
  // Spain
  madrid: "Spain",
  barcelona: "Spain",
  valencia: "Spain",
  seville: "Spain",
  zaragoza: "Spain",
  málaga: "Spain",
  murcia: "Spain",
  palma: "Spain",
  "las palmas": "Spain",
  bilbao: "Spain",
  alicante: "Spain",
  valladolid: "Spain",
  vigo: "Spain",
  gijón: "Spain",
  hospitalet: "Spain",
  vitoria: "Spain",
  granada: "Spain",
  oviedo: "Spain",
  "santa cruz": "Spain",
  
  // Italy
  rome: "Italy",
  milan: "Italy",
  naples: "Italy",
  turin: "Italy",
  palermo: "Italy",
  genoa: "Italy",
  bologna: "Italy",
  florence: "Italy",
  bari: "Italy",
  catania: "Italy",
  venice: "Italy",
  verona: "Italy",
  messina: "Italy",
  padua: "Italy",
  trieste: "Italy",
  brescia: "Italy",
  prato: "Italy",
  taranto: "Italy",
  modena: "Italy",
  reggio: "Italy",
  
  // Netherlands
  amsterdam: "Netherlands",
  rotterdam: "Netherlands",
  "the hague": "Netherlands",
  utrecht: "Netherlands",
  eindhoven: "Netherlands",
  groningen: "Netherlands",
  tilburg: "Netherlands",
  almere: "Netherlands",
  breda: "Netherlands",
  nijmegen: "Netherlands",
  
  // Belgium
  brussels: "Belgium",
  antwerp: "Belgium",
  ghent: "Belgium",
  charleroi: "Belgium",
  liège: "Belgium",
  bruges: "Belgium",
  namur: "Belgium",
  leuven: "Belgium",
  mons: "Belgium",
  aalst: "Belgium",
  
  // Sweden
  stockholm: "Sweden",
  gothenburg: "Sweden",
  malmö: "Sweden",
  uppsala: "Sweden",
  västerås: "Sweden",
  örebro: "Sweden",
  linköping: "Sweden",
  helsingborg: "Sweden",
  jönköping: "Sweden",
  norrköping: "Sweden",
  
  // Norway
  oslo: "Norway",
  bergen: "Norway",
  trondheim: "Norway",
  stavanger: "Norway",
  bærum: "Norway",
  kristiansand: "Norway",
  fredrikstad: "Norway",
  sandnes: "Norway",
  tromsø: "Norway",
  sarpsborg: "Norway",
  
  // Denmark
  copenhagen: "Denmark",
  aarhus: "Denmark",
  odense: "Denmark",
  aalborg: "Denmark",
  esbjerg: "Denmark",
  randers: "Denmark",
  kolding: "Denmark",
  horsens: "Denmark",
  vejle: "Denmark",
  roskilde: "Denmark",
  
  // Poland
  warsaw: "Poland",
  kraków: "Poland",
  łódź: "Poland",
  wrocław: "Poland",
  poznan: "Poland",
  gdańsk: "Poland",
  szczecin: "Poland",
  bydgoszcz: "Poland",
  lublin: "Poland",
  katowice: "Poland",
  
  // Portugal
  lisbon: "Portugal",
  porto: "Portugal",
  amadora: "Portugal",
  braga: "Portugal",
  setúbal: "Portugal",
  coimbra: "Portugal",
  queluz: "Portugal",
  funchal: "Portugal",
  cacem: "Portugal",
  "vila nova": "Portugal",
  
  // Greece
  athens: "Greece",
  thessaloniki: "Greece",
  patras: "Greece",
  piraeus: "Greece",
  larissa: "Greece",
  heraklion: "Greece",
  peristeri: "Greece",
  kallithea: "Greece",
  acharnes: "Greece",
  kalamaria: "Greece",
  
  // Switzerland
  zurich: "Switzerland",
  geneva: "Switzerland",
  basel: "Switzerland",
  bern: "Switzerland",
  lausanne: "Switzerland",
  winterthur: "Switzerland",
  "st. gallen": "Switzerland",
  lucerne: "Switzerland",
  lugano: "Switzerland",
  biel: "Switzerland",
  
  // Brazil
  "são paulo": "Brazil",
  rio: "Brazil",
  "rio de janeiro": "Brazil",
  brasília: "Brazil",
  salvador: "Brazil",
  fortaleza: "Brazil",
  "belo horizonte": "Brazil",
  manaus: "Brazil",
  curitiba: "Brazil",
  recife: "Brazil",
  
  // Mexico
  "mexico city": "Mexico",
  guadalajara: "Mexico",
  monterrey: "Mexico",
  puebla: "Mexico",
  tijuana: "Mexico",
  león: "Mexico",
  juárez: "Mexico",
  torreón: "Mexico",
  querétaro: "Mexico",
  "san luis": "Mexico",
  
  // Argentina
  "buenos aires": "Argentina",
  córdoba: "Argentina",
  rosario: "Argentina",
  mendoza: "Argentina",
  tucumán: "Argentina",
  "la plata": "Argentina",
  "mar del plata": "Argentina",
  salta: "Argentina",
  "santa fe": "Argentina",
  "san juan": "Argentina",
  
  // Japan
  tokyo: "Japan",
  yokohama: "Japan",
  osaka: "Japan",
  nagoya: "Japan",
  sapporo: "Japan",
  fukuoka: "Japan",
  kobe: "Japan",
  kyoto: "Japan",
  kawasaki: "Japan",
  saitama: "Japan",
  
  // South Korea
  seoul: "South Korea",
  busan: "South Korea",
  incheon: "South Korea",
  daegu: "South Korea",
  daejeon: "South Korea",
  gwangju: "South Korea",
  suwon: "South Korea",
  goyang: "South Korea",
  seongnam: "South Korea",
  bucheon: "South Korea",
  
  // China
  beijing: "China",
  shanghai: "China",
  guangzhou: "China",
  shenzhen: "China",
  chengdu: "China",
  chongqing: "China",
  tianjin: "China",
  nanjing: "China",
  wuhan: "China",
  xian: "China",
  
  // India
  mumbai: "India",
  delhi: "India",
  bangalore: "India",
  hyderabad: "India",
  chennai: "India",
  kolkata: "India",
  pune: "India",
  ahmedabad: "India",
  surat: "India",
  jaipur: "India",
  
  // South Africa
  johannesburg: "South Africa",
  "cape town": "South Africa",
  durban: "South Africa",
  pretoria: "South Africa",
  "port elizabeth": "South Africa",
  pietermaritzburg: "South Africa",
  benoni: "South Africa",
  tembisa: "South Africa",
  "east london": "South Africa",
  vereeniging: "South Africa",
  
  // Thailand
  bangkok: "Thailand",
  "chiang mai": "Thailand",
  pattaya: "Thailand",
  "hat yai": "Thailand",
  phuket: "Thailand",
  "nakhon ratchasima": "Thailand",
  "ubon ratchathani": "Thailand",
  "chon buri": "Thailand",
  "nakhon si thammarat": "Thailand",
  "khon kaen": "Thailand",
  
  // Philippines
  manila: "Philippines",
  quezon: "Philippines",
  caloocan: "Philippines",
  davao: "Philippines",
  cebu: "Philippines",
  zamboanga: "Philippines",
  antipolo: "Philippines",
  pasig: "Philippines",
  taguig: "Philippines",
  valenzuela: "Philippines",
  
  // Russia
  moscow: "Russia",
  "saint petersburg": "Russia",
  novosibirsk: "Russia",
  yekaterinburg: "Russia",
  kazan: "Russia",
  "nizhny novgorod": "Russia",
  chelyabinsk: "Russia",
  samara: "Russia",
  omsk: "Russia",
  rostov: "Russia",
  
  // New Zealand
  auckland: "New Zealand",
  wellington: "New Zealand",
  christchurch: "New Zealand",
  napier: "New Zealand",
  dunedin: "New Zealand",
  palmerston: "New Zealand",
  rotorua: "New Zealand",
  "new plymouth": "New Zealand",
  whangarei: "New Zealand",
};

/**
 * Get the country for a given city name (case-insensitive)
 */
export function getCountryForCity(city: string): string | null {
  if (!city) return null;
  const normalized = city.trim().toLowerCase();
  return CITY_TO_COUNTRY[normalized] || null;
}

/**
 * Get all cities for a given country (case-insensitive)
 */
export function getCitiesForCountry(country: string): string[] {
  if (!country) return [];
  const normalized = country.trim().toLowerCase();
  const cities: string[] = [];
  
  for (const [city, cityCountry] of Object.entries(CITY_TO_COUNTRY)) {
    if (cityCountry.toLowerCase() === normalized) {
      cities.push(city);
    }
  }
  
  return cities;
}

/**
 * Check if a search term is a country name and return matching cities
 */
export function getCitiesForCountrySearch(searchTerm: string): string[] {
  if (!searchTerm) return [];
  const normalized = searchTerm.trim().toLowerCase();
  
  // Handle common country name variations
  const countryVariations: Record<string, string> = {
    "united kingdom": "United Kingdom",
    "uk": "United Kingdom",
    "u.k.": "United Kingdom",
    "england": "England",
    "scotland": "Scotland",
    "wales": "Wales",
    "united states": "United States",
    "usa": "United States",
    "u.s.a.": "United States",
    "america": "United States",
    "united states of america": "United States",
    "us": "United States",
  };
  
  // Check if it's a known country variation
  const countryName = countryVariations[normalized] || normalized;
  
  return getCitiesForCountry(countryName);
}
