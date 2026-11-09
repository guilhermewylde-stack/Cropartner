import React, { useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { getApiKey, setApiKey } from '../lib/native/settings';
import { Button, Card, Field, Muted, styles, Title } from '../components/ui';
import { MODEL } from '../lib/ai';

export default function Settings() {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => {
      setSaved(!!k);
      setKey(k ? '••••••••' + k.slice(-4) : '');
    });
  }, []);

  const save = async () => {
    if (key.startsWith('••')) return;
    await setApiKey(key);
    setSaved(!!key.trim());
    setKey(key.trim() ? '••••••••' + key.trim().slice(-4) : '');
    Alert.alert('Pronto', key.trim() ? 'Chave salva no aparelho.' : 'Chave removida.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Title>Leitura de receitas com IA</Title>
        <Muted>
          Para ler receitas e gráficos de fotos e PDFs, o app usa o Claude ({MODEL}). Crie uma chave em console.anthropic.com e cole abaixo. A
          chave fica guardada só neste aparelho (armazenamento seguro) e os arquivos são enviados diretamente à Anthropic.
        </Muted>
        <Field
          label="Chave da API da Anthropic"
          value={key}
          onChangeText={setKey}
          onFocus={() => key.startsWith('••') && setKey('')}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!key.startsWith('••')}
          placeholder="sk-ant-..."
        />
        <Button title="Salvar chave" onPress={save} />
        {saved && (
          <Button
            title="Remover chave"
            variant="ghost"
            onPress={async () => {
              await setApiKey(null);
              setSaved(false);
              setKey('');
            }}
          />
        )}
      </Card>
      <Card>
        <Title>Sem chave?</Title>
        <Muted>Tudo funciona sem IA, exceto a leitura automática: você pode criar o grid manualmente ou a partir de uma imagem (leitura por pixels, feita no aparelho).</Muted>
      </Card>
    </ScrollView>
  );
}
