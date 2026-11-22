export interface District {
  id: string;
  name_en: string;
  name_bn: string;
  is_dhaka: boolean;
}

export const BANGLADESH_DISTRICTS: District[] = [
  // Dhaka Division
  { id: 'dhaka', name_en: 'Dhaka', name_bn: 'ঢাকা', is_dhaka: true },
  { id: 'gazipur', name_en: 'Gazipur', name_bn: 'গাজীপুর', is_dhaka: false },
  { id: 'narayanganj', name_en: 'Narayanganj', name_bn: 'নারায়ণগঞ্জ', is_dhaka: false },
  { id: 'tangail', name_en: 'Tangail', name_bn: 'টাঙ্গাইল', is_dhaka: false },
  { id: 'kishoreganj', name_en: 'Kishoreganj', name_bn: 'কিশোরগঞ্জ', is_dhaka: false },
  { id: 'manikganj', name_en: 'Manikganj', name_bn: 'মানিকগঞ্জ', is_dhaka: false },
  { id: 'munshiganj', name_en: 'Munshiganj', name_bn: 'মুন্সীগঞ্জ', is_dhaka: false },
  { id: 'narsingdi', name_en: 'Narsingdi', name_bn: 'নরসিংদী', is_dhaka: false },
  { id: 'faridpur', name_en: 'Faridpur', name_bn: 'ফরিদপুর', is_dhaka: false },
  { id: 'gopalganj', name_en: 'Gopalganj', name_bn: 'গোপালগঞ্জ', is_dhaka: false },
  { id: 'madaripur', name_en: 'Madaripur', name_bn: 'মাদারীপুর', is_dhaka: false },
  { id: 'rajbari', name_en: 'Rajbari', name_bn: 'রাজবাড়ী', is_dhaka: false },
  { id: 'shariatpur', name_en: 'Shariatpur', name_bn: 'শরীয়তপুর', is_dhaka: false },

  // Chattogram Division
  { id: 'chattogram', name_en: 'Chattogram', name_bn: 'চট্টগ্রাম', is_dhaka: false },
  { id: 'coxs-bazar', name_en: "Cox's Bazar", name_bn: 'কক্সবাজার', is_dhaka: false },
  { id: 'cumilla', name_en: 'Cumilla', name_bn: 'কুমিল্লা', is_dhaka: false },
  { id: 'feni', name_en: 'Feni', name_bn: 'ফেনী', is_dhaka: false },
  { id: 'brahmanbaria', name_en: 'Brahmanbaria', name_bn: 'ব্রাহ্মণবাড়িয়া', is_dhaka: false },
  { id: 'noakhali', name_en: 'Noakhali', name_bn: 'নোয়াখালী', is_dhaka: false },
  { id: 'lakshmipur', name_en: 'Lakshmipur', name_bn: 'লক্ষ্মীপুর', is_dhaka: false },
  { id: 'chandpur', name_en: 'Chandpur', name_bn: 'চাঁদপুর', is_dhaka: false },
  { id: 'rangamati', name_en: 'Rangamati', name_bn: 'রাঙ্গামাটি', is_dhaka: false },
  { id: 'bandarban', name_en: 'Bandarban', name_bn: 'বান্দরবান', is_dhaka: false },
  { id: 'khagrachhari', name_en: 'Khagrachhari', name_bn: 'খাগড়াছড়ি', is_dhaka: false },

  // Rajshahi Division
  { id: 'rajshahi', name_en: 'Rajshahi', name_bn: 'রাজশাহী', is_dhaka: false },
  { id: 'bogura', name_en: 'Bogura', name_bn: 'বগুড়া', is_dhaka: false },
  { id: 'pabna', name_en: 'Pabna', name_bn: 'পাবনা', is_dhaka: false },
  { id: 'sirajganj', name_en: 'Sirajganj', name_bn: 'সিরাজগঞ্জ', is_dhaka: false },
  { id: 'naogaon', name_en: 'Naogaon', name_bn: 'নওগাঁ', is_dhaka: false },
  { id: 'natore', name_en: 'Natore', name_bn: 'নাটোর', is_dhaka: false },
  { id: 'chapainawabganj', name_en: 'Chapainawabganj', name_bn: 'চাঁপাইনবাবগঞ্জ', is_dhaka: false },
  { id: 'joypurhat', name_en: 'Joypurhat', name_bn: 'জয়পুরহাট', is_dhaka: false },

  // Khulna Division
  { id: 'khulna', name_en: 'Khulna', name_bn: 'খুলনা', is_dhaka: false },
  { id: 'jashore', name_en: 'Jashore', name_bn: 'যশোর', is_dhaka: false },
  { id: 'satkhira', name_en: 'Satkhira', name_bn: 'সাতক্ষীরা', is_dhaka: false },
  { id: 'jhenaidah', name_en: 'Jhenaidah', name_bn: 'ঝিনাইদহ', is_dhaka: false },
  { id: 'magura', name_en: 'Magura', name_bn: 'মাগুরা', is_dhaka: false },
  { id: 'narail', name_en: 'Narail', name_bn: 'নড়াইল', is_dhaka: false },
  { id: 'bagerhat', name_en: 'Bagerhat', name_bn: 'বাগেরহাট', is_dhaka: false },
  { id: 'kushtia', name_en: 'Kushtia', name_bn: 'কুষ্টিয়া', is_dhaka: false },
  { id: 'chuadanga', name_en: 'Chuadanga', name_bn: 'চুয়াডাঙ্গা', is_dhaka: false },
  { id: 'meherpur', name_en: 'Meherpur', name_bn: 'মেহেরপুর', is_dhaka: false },

  // Barishal Division
  { id: 'barishal', name_en: 'Barishal', name_bn: 'বরিশাল', is_dhaka: false },
  { id: 'bhola', name_en: 'Bhola', name_bn: 'ভোলা', is_dhaka: false },
  { id: 'jhalokathi', name_en: 'Jhalokathi', name_bn: 'ঝালকাঠি', is_dhaka: false },
  { id: 'pirojpur', name_en: 'Pirojpur', name_bn: 'পিরোজপুর', is_dhaka: false },
  { id: 'barguna', name_en: 'Barguna', name_bn: 'বরগুনা', is_dhaka: false },
  { id: 'patuakhali', name_en: 'Patuakhali', name_bn: 'পটুয়াখালী', is_dhaka: false },

  // Sylhet Division
  { id: 'sylhet', name_en: 'Sylhet', name_bn: 'সিলেট', is_dhaka: false },
  { id: 'moulvibazar', name_en: 'Moulvibazar', name_bn: 'মৌলভীবাজার', is_dhaka: false },
  { id: 'habiganj', name_en: 'Habiganj', name_bn: 'হবিগঞ্জ', is_dhaka: false },
  { id: 'sunamganj', name_en: 'Sunamganj', name_bn: 'সুনামগঞ্জ', is_dhaka: false },

  // Rangpur Division
  { id: 'rangpur', name_en: 'Rangpur', name_bn: 'রংপুর', is_dhaka: false },
  { id: 'dinajpur', name_en: 'Dinajpur', name_bn: 'দিনাজপুর', is_dhaka: false },
  { id: 'gaibandha', name_en: 'Gaibandha', name_bn: 'গাইবান্ধা', is_dhaka: false },
  { id: 'kurigram', name_en: 'Kurigram', name_bn: 'কুড়িগ্রাম', is_dhaka: false },
  { id: 'lalmonirhat', name_en: 'Lalmonirhat', name_bn: 'লালমনিরহাট', is_dhaka: false },
  { id: 'nilphamari', name_en: 'Nilphamari', name_bn: 'নীলফামারী', is_dhaka: false },
  { id: 'panchagarh', name_en: 'Panchagarh', name_bn: 'পঞ্চগড়', is_dhaka: false },
  { id: 'thakurgaon', name_en: 'Thakurgaon', name_bn: 'ঠাকুরগাঁও', is_dhaka: false },

  // Mymensingh Division
  { id: 'mymensingh', name_en: 'Mymensingh', name_bn: 'ময়মনসিংহ', is_dhaka: false },
  { id: 'jamalpur', name_en: 'Jamalpur', name_bn: 'জামালপুর', is_dhaka: false },
  { id: 'netrokona', name_en: 'Netrokona', name_bn: 'নেত্রকোণা', is_dhaka: false },
  { id: 'sherpur', name_en: 'Sherpur', name_bn: 'শেরপুর', is_dhaka: false },
];
