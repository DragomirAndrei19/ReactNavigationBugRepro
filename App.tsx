/**
 * Minimal reproduction for react-native-screens 4.25.0 issues observed after
 * upgrading to react-native 0.85.3 + @react-navigation/* 7.x.
 *
 * Versions (see package.json):
 *   - react-native:                   0.85.3
 *   - react-native-screens:           ^4.25.0
 *   - @react-navigation/native:       ^7.2.4
 *   - @react-navigation/native-stack: ^7.15.0
 *   - @react-navigation/bottom-tabs:  ^7.16.0
 *   - react-native-safe-area-context: ^5.7.0
 *   - react-native-gesture-handler:   ^2.31.2
 *
 * Structure (mirrors the production app):
 *   NavigationContainer
 *     RootStack (native stack)
 *       Tabs (native bottom tabs, unstable)
 *         HomeTab     -> nested native stack -> HomeScreen
 *         ListTab     -> nested native stack -> ListScreen
 *         SettingsTab -> nested native stack -> SettingsScreen
 *       DetailsScreen (root-level secondary, navigated to from ListScreen)
 *
 * Observed issues:
 *   1) Warning on launch / tab switches:
 *      "[RNScreens] ColorSchemeCoordinator's setup method must not be called
 *       again without calling teardown() first."
 *   2) White flashing screen when a tab is mounted for the first time
 *      (or re-mounted after popToTop via blur).
 */
import * as React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type RootStackParamList = {
  AuthenticatedTabs: undefined;
  Details: { id: string; title: string };
};

type TabParamList = {
  HomeTab: undefined;
  ListTab: undefined;
  SettingsTab: undefined;
};

type HomeStackParamList = { Home: undefined };
type ListStackParamList = { ListMain: undefined };
type SettingsStackParamList = { SettingsMain: undefined };

// -----------------------------------------------------------------------------
// Navigators
// -----------------------------------------------------------------------------
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createNativeBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ListStack = createNativeStackNavigator<ListStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

// Matches getDefaultNestedStackScreenOptions in the production app.
const nestedStackScreenOptions = {
  headerBackVisible: false,
  animation: 'none' as const,
  headerStyle: { backgroundColor: '#1F3A93' },
  headerTitleAlign: 'center' as const,
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { color: '#FFFFFF', fontWeight: '700' as const },
  contentStyle: { backgroundColor: '#FFFFFF' },
};

// Matches getRootStackScreenOptions in the production app.
const rootStackScreenOptions = {
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: '#1F3A93' },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle: { backgroundColor: '#FFFFFF' },
};

// -----------------------------------------------------------------------------
// Screens
// -----------------------------------------------------------------------------
function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.h1}>Home</Text>
      <Text style={styles.body}>First tab. Switch to "List" to reproduce.</Text>
    </SafeAreaView>
  );
}

const LIST_DATA = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: `Item ${i + 1}`,
}));

function ListScreen() {
  // Navigate to the root-level Details screen (mirrors DetaliiAlerta usage).
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={LIST_DATA}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() =>
              navigation.navigate('Details', {
                id: item.id,
                title: item.title,
              })
            }
          >
            <Text style={styles.rowText}>{item.title}</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function SettingsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.body}>Third tab.</Text>
    </SafeAreaView>
  );
}

function DetailsScreen({ route }: any) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.h1}>Details</Text>
      <Text style={styles.body}>id: {route.params?.id}</Text>
      <Text style={styles.body}>title: {route.params?.title}</Text>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Nested stacks (one per tab) — same shape as ListaAlerteStackNavigator etc.
// -----------------------------------------------------------------------------
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={nestedStackScreenOptions}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
    </HomeStack.Navigator>
  );
}

function ListStackNavigator() {
  return (
    <ListStack.Navigator screenOptions={nestedStackScreenOptions}>
      <ListStack.Screen
        name="ListMain"
        component={ListScreen}
        options={{ title: 'List' }}
      />
    </ListStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={nestedStackScreenOptions}>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </SettingsStack.Navigator>
  );
}

// -----------------------------------------------------------------------------
// Tab navigator (native, unstable) — same shape as production TabNavigator.
// -----------------------------------------------------------------------------
function TabNavigator() {
  return (
    <Tab.Navigator
      backBehavior="history"
      initialRouteName="ListTab"
      screenOptions={{
        popToTopOnBlur: true,
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1F3A93' },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#B5C0E6',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ListTab"
        component={ListStackNavigator}
        options={{ tabBarLabel: 'List' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// -----------------------------------------------------------------------------
// Root
// -----------------------------------------------------------------------------
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1F3A93',
    background: '#FFFFFF',
    card: '#1F3A93',
    text: '#FFFFFF',
    border: '#1F3A93',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootStack.Navigator screenOptions={rootStackScreenOptions}>
            <RootStack.Screen
              name="AuthenticatedTabs"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <RootStack.Screen
              name="Details"
              component={DetailsScreen}
              options={{
                title: 'Details',
                headerBackVisible: true,
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitle: 'List',
              }}
            />
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  h1: { fontSize: 22, fontWeight: '700', padding: 16 },
  body: { fontSize: 15, paddingHorizontal: 16, paddingBottom: 8 },
  listContent: { paddingVertical: 8 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: { backgroundColor: '#F0F2FA' },
  rowText: { fontSize: 16 },
  rowChevron: { fontSize: 22, color: '#888' },
});
