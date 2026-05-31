import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { C, S, R, F } from '../lib/theme';

// ===== ラベル付きフィールド枠 =====
export function Field({
  label,
  children,
  hint,
  style,
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ===== テキスト入力 =====
export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  autoCapitalize?: 'none' | 'characters' | 'sentences';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textMute}
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={[styles.input, multiline && styles.inputMultiline]}
    />
  );
}

// ===== 数値ステッパー =====
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  label,
  style,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
  style?: ViewStyle;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <View style={[{ gap: 4 }, style]}>
      {label ? <Text style={styles.stepperLabel}>{label}</Text> : null}
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(clamp(value - 1))} hitSlop={8}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <TextInput
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
            onChange(Number.isNaN(n) ? min : clamp(n));
          }}
          keyboardType="number-pad"
          style={styles.stepValue}
        />
        <Pressable style={styles.stepBtn} onPress={() => onChange(clamp(value + 1))} hitSlop={8}>
          <Text style={styles.stepBtnText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ===== セレクト(モーダルのリスト選択) =====
export interface SelectOption {
  label: string;
  value: string;
}

export function Select({
  value,
  options,
  onSelect,
  placeholder = '選択してください',
  title,
}: {
  value: string | null;
  options: SelectOption[];
  onSelect: (v: string) => void;
  placeholder?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable style={styles.select} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !current && styles.selectPlaceholder]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Text style={styles.selectChevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
            <ScrollView style={{ maxHeight: 380 }}>
              {options.length === 0 ? (
                <Text style={styles.sheetEmpty}>選択肢がありません</Text>
              ) : (
                options.map((o) => {
                  const sel = o.value === value;
                  return (
                    <Pressable
                      key={o.value}
                      style={[styles.option, sel && styles.optionSelected]}
                      onPress={() => {
                        onSelect(o.value);
                        setOpen(false);
                      }}>
                      <Text style={[styles.optionText, sel && styles.optionTextSelected]}>{o.label}</Text>
                      {sel ? <Text style={styles.check}>✓</Text> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: F.small, fontWeight: '600', color: C.text },
  hint: { fontSize: F.tiny, color: C.textMute },
  input: {
    backgroundColor: C.glassFillStrong,
    borderWidth: 1,
    borderColor: C.glassEdge,
    borderRadius: R.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: F.body,
    color: C.text,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  stepperLabel: { fontSize: F.small, color: C.textSoft, textAlign: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    backgroundColor: C.glassFillStrong,
    borderWidth: 1,
    borderColor: C.glassEdge,
    borderRadius: R.md,
  },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  stepBtnText: { fontSize: 20, color: C.accentDeep, fontWeight: '700' },
  stepValue: {
    flex: 1,
    minWidth: 24,
    textAlign: 'center',
    fontSize: F.h3,
    fontWeight: '700',
    color: C.text,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.glassFillStrong,
    borderWidth: 1,
    borderColor: C.glassEdge,
    borderRadius: R.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 6,
  },
  selectText: { fontSize: F.body, color: C.text, flex: 1 },
  selectPlaceholder: { color: C.textMute },
  selectChevron: { fontSize: 12, color: C.textSoft },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: S.four,
  },
  sheet: {
    backgroundColor: C.card,
    borderRadius: R.xl,
    padding: S.three,
    gap: 4,
    borderWidth: 1,
    borderColor: C.glassEdge,
  },
  sheetTitle: { fontSize: F.h4, fontWeight: '700', color: C.text, paddingHorizontal: 6, paddingBottom: 6 },
  sheetEmpty: { color: C.textMute, padding: S.three, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: R.sm,
  },
  optionSelected: { backgroundColor: C.accentSoft },
  optionText: { fontSize: F.body, color: C.text },
  optionTextSelected: { fontWeight: '700' },
  check: { color: C.accent, fontWeight: '700' },
});
