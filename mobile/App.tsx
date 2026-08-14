import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Category = {
  id: number;
  name: string;
};

type ListingImage = {
  id: number;
  url: string;
};

type Listing = {
  id: number;
  title: string;
  price: string | number | null;
  city: string;
  images?: ListingImage[];
};

type Paginated<T> = {
  data: T[];
};

const API_URL = 'https://used.pm.sa/api';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`تعذر تحميل البيانات (${response.status})`);
  }
  return response.json();
}

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const listingsPath = useMemo(
    () => `/listings${selectedCategory ? `?category_id=${selectedCategory}` : ''}`,
    [selectedCategory],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [cats, result] = await Promise.all([
          getJson<Category[]>('/categories'),
          getJson<Paginated<Listing>>(listingsPath),
        ]);
        if (!active) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setListings(Array.isArray(result?.data) ? result.data : []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [listingsPath]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>مستعمل مجاني</Text>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>بيع واشتري بسهولة</Text>
          <Text style={styles.heroText}>أعلن مجانًا وتواصل مباشرة مع البائع</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          <Pressable
            style={[styles.category, selectedCategory === undefined && styles.categoryActive]}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text style={[styles.categoryText, selectedCategory === undefined && styles.categoryTextActive]}>الكل</Text>
          </Pressable>

          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.category, selectedCategory === category.id && styles.categoryActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" />
            <Text style={styles.stateText}>جاري تحميل الإعلانات...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>لا توجد إعلانات بعد</Text>
            <Text style={styles.stateText}>كن أول من يضيف إعلانًا في هذا القسم.</Text>
          </View>
        ) : (
          listings.map((item) => {
            const image = item.images?.[0]?.url;
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.imageWrap}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <Text style={styles.noImage}>لا توجد صورة</Text>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.price}>
                    {item.price ? `${money.format(Number(item.price))} ر.س` : 'السعر عند التواصل'}
                  </Text>
                  <Text style={styles.city}>{item.city || 'بدون مدينة'}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7F6',
  },
  topBar: {
    paddingTop: 42,
    paddingBottom: 12,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D7E0DE',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F766E',
  },
  page: {
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'flex-end',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'right',
  },
  heroText: {
    color: '#D5F2EF',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'right',
  },
  categories: {
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  category: {
    minWidth: 78,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E0DE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  categoryActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  categoryText: {
    color: '#243333',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  stateBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#243333',
  },
  stateText: {
    fontSize: 14,
    color: '#647270',
    textAlign: 'center',
  },
  errorBox: {
    marginHorizontal: 14,
    marginTop: 6,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    color: '#991B1B',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7E0DE',
  },
  imageWrap: {
    height: 180,
    backgroundColor: '#E9EFEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    color: '#7A8987',
  },
  cardBody: {
    padding: 14,
    alignItems: 'flex-end',
  },
  cardTitle: {
    color: '#243333',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },
  price: {
    color: '#0F766E',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 8,
  },
  city: {
    color: '#647270',
    fontSize: 13,
    marginTop: 7,
  },
});
