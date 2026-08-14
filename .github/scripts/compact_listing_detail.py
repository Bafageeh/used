from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text(encoding='utf-8')
old = '''          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{detail.title}</Text>
            <Text style={styles.detailPrice}>مجانا</Text>
            <View style={{ alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: PURPLE_LIGHT, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 10 }}>
              <Ionicons name={ITEM_CONDITIONS.find((x) => x.key === detail.item_condition)?.icon || 'checkmark-circle-outline'} size={17} color={PURPLE} />
              <Text style={{ color: PURPLE_DARK, fontWeight: '900', fontSize: 12 }}>{itemConditionLabel(detail.item_condition)}</Text>
            </View>
            <View style={styles.detailMetaLine}><Text style={styles.detailMetaText}>{detail.city}</Text><Ionicons name="location-outline" size={19} color={PURPLE} /></View>
            <View style={styles.detailSeparator} />'''
new = '''          <View style={[styles.detailBody, { paddingVertical: 12 }]}>
            <View style={{ width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text numberOfLines={2} style={[styles.detailTitle, { flex: 1 }]}>{detail.title}</Text>
              <Text style={[styles.detailPrice, { marginTop: 0, fontSize: 20 }]}>مجانا</Text>
            </View>
            <View style={{ width: '100%', marginTop: 9, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: PURPLE_LIGHT, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Ionicons name={ITEM_CONDITIONS.find((x) => x.key === detail.item_condition)?.icon || 'checkmark-circle-outline'} size={16} color={PURPLE} />
                <Text style={{ color: PURPLE_DARK, fontWeight: '900', fontSize: 12 }}>{itemConditionLabel(detail.item_condition)}</Text>
              </View>
              <View style={[styles.detailMetaLine, { marginTop: 0, flexShrink: 1 }]}>
                <Text numberOfLines={1} style={styles.detailMetaText}>{detail.city}</Text>
                <Ionicons name="location-outline" size={18} color={PURPLE} />
              </View>
            </View>
            <View style={[styles.detailSeparator, { marginVertical: 10 }]} />'''
if old not in s:
    raise SystemExit('detail block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Compacted listing detail header')
