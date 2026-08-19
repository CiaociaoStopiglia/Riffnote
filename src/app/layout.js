// src/app/layout.js
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

export const metadata = {
    title: 'FrontEnd - Codeverse',
    description: 'Template do Codeverse',
};

// Tema dark do Riffnote aplicado a TODOS os componentes do Ant Design
// (Modal, Input, Button, etc) de uma vez só — sem precisar sobrescrever
// CSS na mão em cada componente.
const riffnoteTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
        colorPrimary: '#c9432b',
        colorBgContainer: '#1c1920',
        colorBgElevated: '#1c1920',
        colorBorder: '#322c36',
        colorText: '#f4efe6',
        colorTextPlaceholder: '#6f6860',
        borderRadius: 10,
        fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body className="min-h-screen antialiased">
                <AuthProvider>
                    <AntdRegistry>
                        <ConfigProvider theme={riffnoteTheme}>
                            {children}
                        </ConfigProvider>
                    </AntdRegistry>
                    <Toaster />
                </AuthProvider>
            </body>
        </html>
    );
}
