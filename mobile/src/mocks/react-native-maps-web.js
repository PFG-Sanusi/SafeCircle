// Mock for react-native-maps on web platform
import React from 'react';
import { View } from 'react-native';

// Mock MapView component
export default function MapView(props) {
    return <View {...props} />;
}

// Mock Marker component
export function Marker(props) {
    return null;
}

// Mock PROVIDER_DEFAULT
export const PROVIDER_DEFAULT = 'default';
