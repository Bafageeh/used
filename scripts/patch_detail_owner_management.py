from pathlib import Path

path = Path('mobile/App.tsx')
text = path.read_text()


def replace_once(old: str, new: str, label: str):
    global text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    text = text.replace(old, new, 1)

replace_once(
    "import * as Location from 'expo-location';\n",
    "import * as Location from 'expo-location';\nimport * as SecureStore from 'expo-secure-store';\n",
    'secure-store import',
)

replace_once(
    "  const [user, setUser] = useState<User | null>(null);\n  const [mine, setMine] = useState<Listing[]>([]);",
    "  const [user, setUser] = useState<User | null>(null);\n  const [authRestoring, setAuthRestoring] = useState(true);\n  const [mine, setMine] = useState<Listing[]>([]);",
    'auth restoring state',
)

replace_once(
    "  const [editListing, setEditListing] = useState<Listing | null>(null);\n  const [manageBusyId, setManageBusyId] = useState<number | null>(null);",
    "  const [editListing, setEditListing] = useState<Listing | null>(null);\n  const [editReturnDetailId, setEditReturnDetailId] = useState<number | null>(null);\n  const [manageBusyId, setManageBusyId] = useState<number | null>(null);",
    'detail return state',
)

replace_once(
    "  useEffect(() => { loadHome(); }, [loadHome, refreshKey]);\n\n  useEffect(() => {\n    if (screen !== 'mine' || !token) return;",
    "  useEffect(() => { loadHome(); }, [loadHome, refreshKey]);\n\n  useEffect(() => {\n    let active = true;\n    (async () => {\n      try {\n        const storedToken = await SecureStore.getItemAsync('used_auth_token');\n        if (!storedToken) return;\n        const me = await request<User>('/me', {}, storedToken);\n        if (!active) return;\n        setToken(storedToken);\n        setUser(me);\n      } catch {\n        await SecureStore.deleteItemAsync('used_auth_token').catch(() => undefined);\n      } finally {\n        if (active) setAuthRestoring(false);\n      }\n    })();\n    return () => { active = false; };\n  }, []);\n\n  useEffect(() => {\n    if (screen !== 'mine' || !token) return;",
    'session restore effect',
)

replace_once(
    "          await request(`/listings/${item.id}/refresh`, { method: 'POST' }, token);\n          setRefreshKey((x) => x + 1);\n          Alert.alert('تم التحديث', 'تم تحديث الإعلان ورفعه للأعلى.');",
    "          await request(`/listings/${item.id}/refresh`, { method: 'POST' }, token);\n          const refreshedAt = new Date().toISOString();\n          setDetail((current) => current?.id === item.id ? { ...current, status: 'published', published_at: refreshedAt } : current);\n          setMine((current) => current.map((row) => row.id === item.id ? { ...row, status: 'published', published_at: refreshedAt } : row));\n          setRefreshKey((x) => x + 1);\n          Alert.alert('تم التحديث', 'تم تحديث الإعلان ورفعه للأعلى.');",
    'refresh detail state',
)

replace_once(
    "          setFavorites((current) => current.filter((id) => id !== item.id));\n          setRefreshKey((x) => x + 1);\n          Alert.alert('تم الحذف', 'تم حذف الإعلان.');",
    "          setFavorites((current) => current.filter((id) => id !== item.id));\n          setDetail((current) => current?.id === item.id ? null : current);\n          setEditListing((current) => current?.id === item.id ? null : current);\n          setEditReturnDetailId(null);\n          setScreen('home');\n          setRefreshKey((x) => x + 1);\n          Alert.alert('تم الحذف', 'تم حذف الإعلان.');",
    'delete detail state',
)

replace_once(
    "  const editOwnListing = (item: Listing) => {\n    setEditListing(item);\n    setScreen('add');\n  };\n\n  const loggedIn = (nextToken: string, nextUser: User) => { setToken(nextToken); setUser(nextUser); };",
    "  const editOwnListing = (item: Listing, returnToDetail = false) => {\n    setEditReturnDetailId(returnToDetail ? item.id : null);\n    setEditListing(item);\n    setDetail(null);\n    setScreen('add');\n  };\n\n  const loggedIn = (nextToken: string, nextUser: User) => {\n    setToken(nextToken);\n    setUser(nextUser);\n    SecureStore.setItemAsync('used_auth_token', nextToken).catch(() => undefined);\n  };\n\n  const logout = () => {\n    SecureStore.deleteItemAsync('used_auth_token').catch(() => undefined);\n    setToken('');\n    setUser(null);\n    setMine([]);\n    setDetail(null);\n    setEditListing(null);\n    setEditReturnDetailId(null);\n    setScreen('home');\n  };",
    'edit/login/logout helpers',
)

replace_once(
    "  if (detail) {\n    const photos = detail.images || [];\n    const favorite = favorites.includes(detail.id);",
    "  if (detail) {\n    const photos = detail.images || [];\n    const favorite = favorites.includes(detail.id);\n    const isOwner = Boolean(token && user && detail.user?.id === user.id);\n    const statusLabel = detail.status === 'sold' ? 'مباع' : detail.status === 'archived' ? 'مؤرشف' : detail.status === 'draft' ? 'مسودة' : 'منشور';",
    'owner detail flags',
)

replace_once(
    "            {detail.user?.phone ? (\n              <View style={styles.phoneBox}><Ionicons name=\"call\" size={20} color=\"#fff\" /><Text style={styles.phoneText}>{detail.user.phone}</Text></View>\n            ) : null}\n          </View>",
    "            {detail.user?.phone ? (\n              <View style={styles.phoneBox}><Ionicons name=\"call\" size={20} color=\"#fff\" /><Text style={styles.phoneText}>{detail.user.phone}</Text></View>\n            ) : null}\n\n            {isOwner ? (\n              <View style={styles.ownerManageSection}>\n                <View style={styles.ownerManageHeading}>\n                  <View style={styles.ownerStatusBadge}><Text style={styles.ownerStatusText}>الحالة: {statusLabel}</Text></View>\n                  <View style={styles.ownerManageTitleWrap}>\n                    <Text style={styles.ownerManageTitle}>إدارة إعلانك</Text>\n                    <Text style={styles.ownerManageHint}>هذه الخيارات تظهر لك فقط بصفتك صاحب الإعلان</Text>\n                  </View>\n                </View>\n\n                <View style={styles.ownerManageGrid}>\n                  <Pressable style={[styles.ownerManageButton, styles.ownerEditButton]} onPress={() => editOwnListing(detail, true)} disabled={manageBusyId === detail.id}>\n                    <Ionicons name=\"create-outline\" size={21} color={PURPLE} />\n                    <Text style={styles.ownerEditButtonText}>تعديل الإعلان</Text>\n                  </Pressable>\n                  <Pressable style={[styles.ownerManageButton, styles.ownerRefreshButton]} onPress={() => refreshOwnListing(detail)} disabled={manageBusyId === detail.id}>\n                    {manageBusyId === detail.id ? <ActivityIndicator size=\"small\" color=\"#16834A\" /> : <Ionicons name=\"refresh-outline\" size={21} color=\"#16834A\" />}\n                    <Text style={styles.ownerRefreshButtonText}>تحديث الإعلان</Text>\n                  </Pressable>\n                  <Pressable style={[styles.ownerManageButton, styles.ownerStatusButton]} onPress={() => editOwnListing(detail, true)} disabled={manageBusyId === detail.id}>\n                    <Ionicons name=\"swap-horizontal-outline\" size={21} color=\"#B45309\" />\n                    <Text style={styles.ownerStatusButtonText}>تغيير الحالة</Text>\n                  </Pressable>\n                  <Pressable style={[styles.ownerManageButton, styles.ownerDeleteButton]} onPress={() => deleteOwnListing(detail)} disabled={manageBusyId === detail.id}>\n                    <Ionicons name=\"trash-outline\" size={21} color=\"#DC2626\" />\n                    <Text style={styles.ownerDeleteButtonText}>حذف الإعلان</Text>\n                  </Pressable>\n                </View>\n              </View>\n            ) : authRestoring ? (\n              <View style={styles.ownerRestoreRow}><ActivityIndicator size=\"small\" color={PURPLE} /><Text style={styles.ownerRestoreText}>جاري التحقق من حسابك...</Text></View>\n            ) : null}\n          </View>",
    'detail management panel',
)

old_add = "  if (screen === 'add') content = token ? (editListing ? <EditListing listing={editListing} categories={categories} token={token} onSaved={() => { setEditListing(null); setRefreshKey((x) => x + 1); setScreen('mine'); }} onCancel={() => { setEditListing(null); setScreen('mine'); }} /> : <CreateListing categories={categories} token={token} onPublished={published} />) : <LoginPanel onLogin={loggedIn} />;"
new_add = "  if (screen === 'add') content = token ? (editListing ? <EditListing listing={editListing} categories={categories} token={token} onSaved={() => { const returnId = editReturnDetailId; setEditListing(null); setEditReturnDetailId(null); setRefreshKey((x) => x + 1); if (returnId) { setScreen('home'); void openDetail(returnId); } else { setScreen('mine'); } }} onCancel={() => { const returnId = editReturnDetailId; setEditListing(null); setEditReturnDetailId(null); if (returnId) { setScreen('home'); void openDetail(returnId); } else { setScreen('mine'); } }} /> : <CreateListing categories={categories} token={token} onPublished={published} />) : <LoginPanel onLogin={loggedIn} />;"
replace_once(old_add, new_add, 'edit return behavior')

old_mine = """      {mineLoading ? <ActivityIndicator color={PURPLE} /> : mine.length ? mine.map((item) => (\n        <View key={item.id} style={styles.manageListingWrap}>\n          <ListingCard item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />\n          <View style={styles.manageActions}>\n            <Pressable style={[styles.manageButton, styles.manageEdit]} onPress={() => editOwnListing(item)} disabled={manageBusyId === item.id}>\n              <Ionicons name=\"create-outline\" size={18} color={PURPLE} /><Text style={styles.manageEditText}>تعديل</Text>\n            </Pressable>\n            <Pressable style={[styles.manageButton, styles.manageRefresh]} onPress={() => refreshOwnListing(item)} disabled={manageBusyId === item.id}>\n              {manageBusyId === item.id ? <ActivityIndicator size=\"small\" color=\"#16834A\" /> : <Ionicons name=\"refresh-outline\" size={18} color=\"#16834A\" />}\n              <Text style={styles.manageRefreshText}>تحديث</Text>\n            </Pressable>\n            <Pressable style={[styles.manageButton, styles.manageDelete]} onPress={() => deleteOwnListing(item)} disabled={manageBusyId === item.id}>\n              <Ionicons name=\"trash-outline\" size={18} color=\"#DC2626\" /><Text style={styles.manageDeleteText}>حذف</Text>\n            </Pressable>\n          </View>\n        </View>\n      )) : <EmptyScreen icon=\"albums-outline\" title=\"لا توجد إعلانات\" text=\"أضف أول إعلان لك من زر الإضافة.\" />}"""
new_mine = """      {mineLoading ? <ActivityIndicator color={PURPLE} /> : mine.length ? mine.map((item) => (\n        <ListingCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />\n      )) : <EmptyScreen icon=\"albums-outline\" title=\"لا توجد إعلانات\" text=\"أضف أول إعلان لك من زر الإضافة.\" />}"""
replace_once(old_mine, new_mine, 'remove mine action buttons')

replace_once(
    "      <Pressable style={styles.dangerButton} onPress={() => { setToken(''); setUser(null); setMine([]); setScreen('home'); }}><Ionicons name=\"log-out-outline\" size={20} color=\"#DC2626\" /><Text style={styles.dangerText}>تسجيل الخروج</Text></Pressable>",
    "      <Pressable style={styles.dangerButton} onPress={logout}><Ionicons name=\"log-out-outline\" size={20} color=\"#DC2626\" /><Text style={styles.dangerText}>تسجيل الخروج</Text></Pressable>",
    'persistent logout',
)

style_anchor = "  root: { flex: 1, backgroundColor: SURFACE },"
style_insert = """  ownerManageSection: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#EEE7F5', paddingTop: 16 },\n  ownerManageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 },\n  ownerManageTitleWrap: { flex: 1, alignItems: 'flex-end' },\n  ownerManageTitle: { color: TEXT, fontSize: 17, fontWeight: '900', textAlign: 'right' },\n  ownerManageHint: { color: MUTED, fontSize: 10, marginTop: 3, textAlign: 'right' },\n  ownerStatusBadge: { borderRadius: 14, backgroundColor: PURPLE_LIGHT, paddingHorizontal: 10, paddingVertical: 6 },\n  ownerStatusText: { color: PURPLE, fontSize: 11, fontWeight: '900' },\n  ownerManageGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },\n  ownerManageButton: { width: '48.5%', minHeight: 48, borderRadius: 13, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },\n  ownerEditButton: { backgroundColor: '#F7F1FF', borderColor: '#CFB8F5' },\n  ownerEditButtonText: { color: PURPLE, fontSize: 12, fontWeight: '900' },\n  ownerRefreshButton: { backgroundColor: '#F0FDF4', borderColor: '#BBE7C9' },\n  ownerRefreshButtonText: { color: '#16834A', fontSize: 12, fontWeight: '900' },\n  ownerStatusButton: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },\n  ownerStatusButtonText: { color: '#B45309', fontSize: 12, fontWeight: '900' },\n  ownerDeleteButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },\n  ownerDeleteButtonText: { color: '#DC2626', fontSize: 12, fontWeight: '900' },\n  ownerRestoreRow: { marginTop: 14, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 10 },\n  ownerRestoreText: { color: MUTED, fontSize: 11 },\n\n  root: { flex: 1, backgroundColor: SURFACE },"""
replace_once(style_anchor, style_insert, 'owner management styles')

path.write_text(text)
print('detail owner management patch applied')
