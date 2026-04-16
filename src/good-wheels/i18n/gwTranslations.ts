/**
 * Good Wheels — UI translations
 * Supported: EN (English) | ES (Spanish)
 */

export type GwLang = 'EN' | 'ES';

export const GW_TRANSLATIONS = {
  EN: {
    // App shell
    appName:            'Good Wheels',
    signOut:            'Sign out',
    notifications:      'Notifications',
    settings:           'Settings',
    devicePreview:      'Device preview',
    role:               'Role',

    // Sidebar / bottom nav — passenger
    dashboard:          'Dashboard',
    requestRide:        'Request a Ride',
    activeTrip:         'Active Trip',
    rideHistory:        'Ride History',
    savedPlaces:        'Saved Places',
    support:            'Support',
    charities:          'Charities',
    donations:          'Donations',
    profile:            'Profile',
    ride:               'Ride',

    // Sidebar / bottom nav — driver
    queue:              'Queue',
    onTrip:             'On Trip',
    earnings:           'Earnings',
    vehicle:            'Vehicle',
    history:            'History',

    // Sidebar / bottom nav — worker
    home:               'Home',
    tasks:              'Tasks',
    dispatch:           'Dispatch',
    impact:             'Impact',

    // Roles
    roleName_passenger: 'Passenger',
    roleName_driver:    'Driver',
    roleName_worker:    'Worker',

    // Dashboard / map
    tapMapPickup:       'Tap map to set pickup',
    whereToGo:          'Where would you like to go?',
    requestRideBtn:     'Request a Ride',
    noActiveTrip:       'No active trip',
    currentTrip:        'Current Trip',
    searchingDriver:    'Searching for a driver…',
    driverFound:        'Driver found!',
    driverArriving:     'Driver arriving',
    onTrip_status:      'On trip',
    tripCompleted:      'Trip completed',
    tripCancelled:      'Trip cancelled',

    // Settings page
    settingsTitle:      'Settings',
    language:           'Language',
    chooseLanguage:     'Choose your language',
    saveSettings:       'Save',
  },

  ES: {
    // App shell
    appName:            'Good Wheels',
    signOut:            'Cerrar sesión',
    notifications:      'Notificaciones',
    settings:           'Ajustes',
    devicePreview:      'Vista previa',
    role:               'Rol',

    // Sidebar / bottom nav — passenger
    dashboard:          'Inicio',
    requestRide:        'Pedir un viaje',
    activeTrip:         'Viaje activo',
    rideHistory:        'Historial de viajes',
    savedPlaces:        'Lugares guardados',
    support:            'Soporte',
    charities:          'Organizaciones',
    donations:          'Donaciones',
    profile:            'Perfil',
    ride:               'Viaje',

    // Sidebar / bottom nav — driver
    queue:              'Cola',
    onTrip:             'En viaje',
    earnings:           'Ganancias',
    vehicle:            'Vehículo',
    history:            'Historial',

    // Sidebar / bottom nav — worker
    home:               'Inicio',
    tasks:              'Tareas',
    dispatch:           'Despacho',
    impact:             'Impacto',

    // Roles
    roleName_passenger: 'Pasajero',
    roleName_driver:    'Conductor',
    roleName_worker:    'Trabajador',

    // Dashboard / map
    tapMapPickup:       'Toca el mapa para establecer recogida',
    whereToGo:          '¿A dónde quieres ir?',
    requestRideBtn:     'Pedir un viaje',
    noActiveTrip:       'Sin viaje activo',
    currentTrip:        'Viaje actual',
    searchingDriver:    'Buscando conductor…',
    driverFound:        '¡Conductor encontrado!',
    driverArriving:     'Conductor en camino',
    onTrip_status:      'En viaje',
    tripCompleted:      'Viaje completado',
    tripCancelled:      'Viaje cancelado',

    // Settings page
    settingsTitle:      'Ajustes',
    language:           'Idioma',
    chooseLanguage:     'Elige tu idioma',
    saveSettings:       'Guardar',
  },
} satisfies Record<GwLang, Record<string, string>>;

export type GwTranslationKey = keyof typeof GW_TRANSLATIONS.EN;
