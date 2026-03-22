import { useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

export function useShare() {
  const shareRef = useRef<View>(null);

  const shareCard = async (text?: string) => {
    try {
      const uri = await captureRef(shareRef, {
        format: 'png',
        quality: 1.0,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: '診断結果をシェアしよう！',
        });
      }
    } catch (error) {
      console.error('シェアに失敗:', error);
    }
  };

  const saveToGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      const uri = await captureRef(shareRef, {
        format: 'png',
        quality: 1.0,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
    } catch (error) {
      console.error('保存に失敗:', error);
    }
  };

  return { shareRef, shareCard, saveToGallery };
}
