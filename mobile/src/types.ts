export type Category = {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  children?: Category[];
};

export type ListingImage = { id: number; url: string; path?: string };

export type Listing = {
  id: number;
  title: string;
  description: string;
  price: string | number | null;
  city: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status: 'draft' | 'published' | 'sold' | 'archived';
  show_phone?: boolean;
  views_count?: number;
  created_at: string;
  category?: Category;
  images: ListingImage[];
  user?: { id: number; name: string; phone?: string };
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  next_page_url: string | null;
};

export type User = {
  id: number;
  name: string;
  phone: string;
  role: 'user' | 'moderator' | 'admin';
};
