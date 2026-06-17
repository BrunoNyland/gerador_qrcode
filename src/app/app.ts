import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import qrGen from '@brunonyland/qr-gen';
import { Background3DService } from './services/background-3d.service';
import { StorageService } from './services/storage.service';
import { gsap } from 'gsap';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  isLeaving?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') bgCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('qrOutputContainer') qrOutputContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('hiddenImageBuffer') hiddenImageBuffer!: ElementRef<HTMLImageElement>;
  @ViewChild('downloadBtn') downloadBtn!: ElementRef<HTMLButtonElement>;

  // Estado da UI
  public selectedTab = signal<string>('url');
  public activeAccordion = signal<string>('content');
  public toasts = signal<ToastMessage[]>([]);
  public isDarkMode = signal<boolean>(true);
  public accentColor = signal<string>('#4f46e5');
  private toastIdCounter = 0;

  // Modelos de Dados dos Formas
  public urlData = { url: 'https://brunonyland.com' };
  public textData = { text: 'Olá do QR-Gen!' };
  public wifiData = { ssid: 'MinhaRedeWiFi', password: 'SenhaSuperSegura', encryption: 'WPA', hidden: false };
  public whatsappData = { phone: '5511999999999', message: 'Olá! Vim através do QR Code gerado pelo QR-Gen.' };
  public emailData = { recipient: 'contato@brunonyland.com', subject: 'Contato Comercial', body: 'Olá Bruno, gostaria de saber mais sobre...' };
  public phoneData = { phone: '+5511999999999' };
  public pixData = { key: 'contato@brunonyland.com', name: 'Bruno Nyland', city: 'SAO PAULO', amount: null as number | null, txid: 'PEDIDO100' };
  public contactData = { name: 'Bruno Nyland', phone: '+5511999999999', email: 'contato@brunonyland.com', org: 'BrunoNyland Inc', url: 'https://brunonyland.com' };

  // Parâmetros do QR Code (Signals)
  public size = signal<number>(400);
  public rounded = signal<number>(0);
  public quiet = signal<number>(1);
  public ecLevel = signal<'L' | 'M' | 'Q' | 'H'>('H');
  public crisp = signal<boolean>(true);
  public renderMode = signal<'canvas' | 'image' | 'svg'>('canvas');

  // Cores do QR Code (Signals)
  public fillMode = signal<'solid' | 'gradient'>('solid');
  public solidColor = signal<string>('#111111');
  public bgColor = signal<string>('#ffffff');
  public transparentBg = signal<boolean>(false);
  public gradientType = signal<'linear' | 'radial'>('linear');
  public gradientColor1 = signal<string>('#4f46e5');
  public gradientColor2 = signal<string>('#8b5cf6');
  public gradientAngle = signal<number>(135);

  // Marcadores de Canto (Signals)
  public finderShape = signal<'square' | 'circle' | 'rounded' | null>(null);
  public finderEyeShape = signal<'square' | 'circle' | 'rounded' | 'triangle' | 'heart' | 'star' | 'diamond' | null>(null);
  public customFinderColor = signal<boolean>(false);
  public finderColorMode = signal<'solid' | 'gradient'>('solid');
  public finderSolidColor = signal<string>('#4f46e5');
  public finderGradientType = signal<'linear' | 'radial'>('linear');
  public finderGradientColor1 = signal<string>('#4f46e5');
  public finderGradientColor2 = signal<string>('#8b5cf6');
  public finderGradientAngle = signal<number>(135);

  // Logotipo / Badge Central (Signals)
  public badgeMode = signal<'plain' | 'label' | 'image'>('plain');
  public badgeSize = signal<number>(20);
  public labelText = 'QR';
  public labelFont = 'Outfit';
  public labelFontColor = '#4f46e5';
  public labelStrokeColor = '#171719';
  public labelStrokeWidth = signal<number>(0.2);
  public uploadedImageSrc = signal<string | null>(null);

  constructor(
    private background3D: Background3DService,
    private storage: StorageService
  ) {}

  ngOnInit(): void {
    this.loadSavedState();
  }

  ngAfterViewInit(): void {
    // Inicializar o fundo 3D do Three.js
    if (this.bgCanvas) {
      this.background3D.init(this.bgCanvas.nativeElement);
      this.background3D.updateColors(this.accentColor());
    }

    // Gerar o QR inicial
    this.generateQR();

    // GSAP Entrance Animations
    this.animateEntrance();

    // Configurar efeito magnético no botão principal de download
    this.setupMagneticButton();

    // Gerar favicon dinâmico inicial
    this.updateFavicon();
  }

  ngOnDestroy(): void {
    this.background3D.destroy();
  }

  // Alternador de Tabs
  public setTab(tab: string): void {
    this.selectedTab.set(tab);
    this.generateQR();
    this.saveCurrentState();
  }

  // Alternador de Accordion
  public toggleAccordion(panelName: string): void {
    if (this.activeAccordion() === panelName) {
      this.activeAccordion.set('');
    } else {
      this.activeAccordion.set(panelName);
    }
    this.saveCurrentState();
  }

  // Upload de Imagem Central
  public onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) {
        this.showToast('Erro: A imagem deve ter no máximo 2MB.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.uploadedImageSrc.set(result);
        
        // Espera a imagem ser carregada no buffer de imagem oculto
        setTimeout(() => {
          this.generateQR();
          this.showToast('Logotipo carregado com sucesso!', 'success');
        }, 150);
      };
      reader.readAsDataURL(file);
    }
  }

  public removeUploadedImage(): void {
    this.uploadedImageSrc.set(null);
    this.generateQR();
    this.showToast('Logotipo removido.', 'info');
  }

  // Permite ativação do upload de arquivos por teclado
  public onFileUploadKeyDown(event: KeyboardEvent, fileInput: HTMLInputElement): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  }

  // Montar Texto do QR Code baseando-se no Preset Selecionado
  private getQRText(): string {
    const tab = this.selectedTab();
    
    switch (tab) {
      case 'url':
        return this.urlData.url || 'https://brunonyland.com';
      
      case 'text':
        return this.textData.text || '';
      
      case 'wifi':
        // Formato: WIFI:S:ssid;T:WPA;P:password;H:false;;
        const hiddenVal = this.wifiData.hidden ? 'true' : 'false';
        return `WIFI:S:${this.wifiData.ssid};T:${this.wifiData.encryption};P:${this.wifiData.password};H:${hiddenVal};;`;
      
      case 'whatsapp':
        // Formato: https://wa.me/5511999999999?text=Olá
        const msgEncoded = encodeURIComponent(this.whatsappData.message || '');
        const cleanPhone = this.whatsappData.phone.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}${msgEncoded ? '?text=' + msgEncoded : ''}`;
      
      case 'email':
        // Formato: mailto:test@email.com?subject=Subject&body=Body
        const emailSubject = encodeURIComponent(this.emailData.subject || '');
        const emailBody = encodeURIComponent(this.emailData.body || '');
        return `mailto:${this.emailData.recipient}?subject=${emailSubject}&body=${emailBody}`;
      
      case 'phone':
        // Formato: tel:+5511999999999
        return `tel:${this.phoneData.phone}`;
      
      case 'pix':
        // Geração do Payload PIX oficial
        return this.generatePixPayload(
          this.pixData.key,
          this.pixData.name,
          this.pixData.city,
          this.pixData.amount,
          this.pixData.txid
        );
      
      case 'contact':
        // Formato vCard 3.0
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${this.contactData.name}`,
          `TEL:${this.contactData.phone}`,
          `EMAIL:${this.contactData.email}`,
          `ORG:${this.contactData.org}`,
          `URL:${this.contactData.url}`,
          'END:VCARD'
        ].join('\n');

      default:
        return 'https://brunonyland.com';
    }
  }

  // Gera o Payload Oficial do Pix (EMV QRCPS-MPM) com cálculo CRC16
  private generatePixPayload(key: string, name: string, city: string, amount: number | null, txid: string): string {
    const pad = (id: string, value: string): string => {
      const len = value.length.toString().padStart(2, '0');
      return `${id}${len}${value}`;
    };

    const removeAccents = (str: string): string => {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    // Gui e Chave PIX (ID 26)
    const gui = pad('00', 'br.gov.bcb.pix');
    const keyVal = pad('01', key.trim());
    const merchantAccount = pad('26', gui + keyVal);

    // Indicador do formato (ID 00)
    const payloadFormat = pad('00', '01');

    // Merchant Category Code (ID 52)
    const category = pad('52', '0000');

    // Moeda (ID 53) - 986 = BRL
    const currency = pad('53', '986');

    // Valor da Transação (ID 54) - opcional
    let amountStr = '';
    if (amount !== null && amount > 0) {
      amountStr = pad('54', amount.toFixed(2));
    }

    // Código do País (ID 58)
    const country = pad('58', 'BR');

    // Nome do Recebedor (ID 59)
    let cleanName = removeAccents(name).toUpperCase();
    if (cleanName.length > 25) cleanName = cleanName.slice(0, 25);
    const receiver = pad('59', cleanName || 'RECEBEDOR');

    // Cidade do Recebedor (ID 60)
    let cleanCity = removeAccents(city).toUpperCase();
    if (cleanCity.length > 15) cleanCity = cleanCity.slice(0, 15);
    const receiverCity = pad('60', cleanCity || 'SAO PAULO');

    // Informações Adicionais (ID 62) - TXID
    let cleanTxid = txid.trim();
    if (cleanTxid.length > 25) cleanTxid = cleanTxid.slice(0, 25);
    const txidVal = pad('05', cleanTxid || '***');
    const additionalData = pad('62', txidVal);

    // Juntar os pedaços (exceto o CRC final)
    let payload = payloadFormat + merchantAccount + category + currency + amountStr + country + receiver + receiverCity + additionalData;
    payload += '6304'; // CRC16 Header ID 63, len 04

    // Cálculo do CRC16 CCITT
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    for (let i = 0; i < payload.length; i++) {
      const charCode = payload.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        const bit = ((charCode >> (7 - j)) & 1) === 1;
        const c15 = ((crc >> 15) & 1) === 1;
        crc <<= 1;
        if (c15 !== bit) {
          crc ^= polynomial;
        }
      }
    }
    crc &= 0xFFFF;
    const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');

    return payload + crcHex;
  }

  // Gera o QR Code utilizando a biblioteca local qr-gen e anexa na UI
  public generateQR(): void {
    try {
      const text = this.getQRText();
      const options: any = {
        text: text,
        render: this.renderMode(),
        size: this.size(),
        rounded: this.rounded(),
        quiet: this.quiet(),
        ecLevel: this.ecLevel(),
        crisp: this.crisp(),
        back: this.transparentBg() ? null : this.bgColor()
      };

      // Configurar Preenchimento (Solid ou Gradient)
      if (this.fillMode() === 'solid') {
        options.fill = this.solidColor();
      } else {
        options.fill = {
          type: this.gradientType(),
          colors: [this.gradientColor1(), this.gradientColor2()],
          angle: this.gradientAngle()
        };
      }

      // Configurar Marcador de Cantos (Finders)
      if (this.finderShape()) {
        options.finderShape = this.finderShape();
      }
      if (this.finderEyeShape()) {
        options.finderEyeShape = this.finderEyeShape();
      }

      if (this.customFinderColor()) {
        if (this.finderColorMode() === 'solid') {
          options.finderColor = this.finderSolidColor();
        } else {
          options.finderColor = {
            type: this.finderGradientType(),
            colors: [this.finderGradientColor1(), this.finderGradientColor2()],
            angle: this.finderGradientAngle()
          };
        }
      }

      // Configurar Badge/Logotipo Central
      options.mode = this.badgeMode();
      if (this.badgeMode() !== 'plain') {
        options.mSize = this.badgeSize();
        options.mPosX = 50; // Centralizado X
        options.mPosY = 50; // Centralizado Y

        if (this.badgeMode() === 'label') {
          options.label = this.labelText;
          options.fontname = this.labelFont;
          options.fontcolor = this.labelFontColor;
          options.labelStrokeColor = this.labelStrokeColor;
          options.labelStrokeWidth = this.labelStrokeWidth();
        } else if (this.badgeMode() === 'image') {
          // Se houver logotipo carregado no buffer de imagem oculto, repassamos
          if (this.hiddenImageBuffer && this.hiddenImageBuffer.nativeElement && this.uploadedImageSrc()) {
            options.image = this.hiddenImageBuffer.nativeElement;
          } else {
            // Caso contrário, desativa para evitar problemas
            options.mode = 'plain';
          }
        }
      }

      // Limpar o container antigo
      if (this.qrOutputContainer) {
        const container = this.qrOutputContainer.nativeElement;
        container.innerHTML = '';

        // Executar a biblioteca qr-gen
        const qrElement = qrGen(options);
        container.appendChild(qrElement);
      }

      // Salva o estado atualizado automaticamente
      this.saveCurrentState();
    } catch (e: any) {
      console.error('Erro na geração do QR Code', e);
      if (this.qrOutputContainer) {
        this.qrOutputContainer.nativeElement.innerHTML = `
          <div style="color: var(--accent-magenta); font-weight: 500; font-size: 0.9rem; text-align: center; padding: 20px;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
            Erro nos parâmetros.<br><small>${e.message || e}</small>
          </div>
        `;
      }
    }
  }

  // Baixar QR Code como PNG
  public downloadPNG(): void {
    if (!this.qrOutputContainer) return;
    const element = this.qrOutputContainer.nativeElement.querySelector('canvas, svg, img');
    if (!element) {
      this.showToast('Erro: Nenhum QR Code gerado para download.', 'error');
      return;
    }

    const filename = `qrcode_${this.selectedTab()}_${Date.now()}.png`;

    try {
      if (element instanceof HTMLCanvasElement) {
        const url = element.toDataURL('image/png');
        this.triggerDownload(url, filename);
        this.showToast('QR Code PNG baixado com sucesso!', 'success');
      } else if (element instanceof SVGElement) {
        // Converte o SVG para canvas temporário para baixar em PNG
        this.convertSvgToCanvasAndDownload(element, filename);
      } else if (element instanceof HTMLImageElement) {
        this.triggerDownload(element.src, filename);
        this.showToast('QR Code PNG baixado com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      this.showToast('Erro ao exportar PNG: ' + err.message, 'error');
    }
  }

  // Baixar QR Code como SVG
  public downloadSVG(): void {
    if (!this.qrOutputContainer) return;
    const element = this.qrOutputContainer.nativeElement.querySelector('canvas, svg, img');
    if (!element) {
      this.showToast('Erro: Nenhum QR Code gerado.', 'error');
      return;
    }

    const filename = `qrcode_${this.selectedTab()}_${Date.now()}.svg`;

    try {
      if (element instanceof SVGElement) {
        const svgString = new XMLSerializer().serializeToString(element);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        this.triggerDownload(url, filename);
        URL.revokeObjectURL(url);
        this.showToast('QR Code SVG baixado com sucesso!', 'success');
      } else {
        // Se renderizado como Canvas/Image, gera o SVG dinamicamente usando a função utilitária da biblioteca
        const text = this.getQRText();
        const options: any = {
          text: text,
          render: 'svg',
          size: this.size(),
          rounded: this.rounded(),
          quiet: this.quiet(),
          ecLevel: this.ecLevel(),
          crisp: this.crisp(),
          back: this.transparentBg() ? null : this.bgColor()
        };

        if (this.fillMode() === 'solid') {
          options.fill = this.solidColor();
        } else {
          options.fill = {
            type: this.gradientType(),
            colors: [this.gradientColor1(), this.gradientColor2()],
            angle: this.gradientAngle()
          };
        }

        if (this.finderShape()) options.finderShape = this.finderShape();
        if (this.finderEyeShape()) options.finderEyeShape = this.finderEyeShape();

        if (this.customFinderColor()) {
          if (this.finderColorMode() === 'solid') {
            options.finderColor = this.finderSolidColor();
          } else {
            options.finderColor = {
              type: this.finderGradientType(),
              colors: [this.finderGradientColor1(), this.finderGradientColor2()],
              angle: this.finderGradientAngle()
            };
          }
        }

        options.mode = this.badgeMode();
        if (this.badgeMode() !== 'plain') {
          options.mSize = this.badgeSize();
          options.mPosX = 50;
          options.mPosY = 50;
          if (this.badgeMode() === 'label') {
            options.label = this.labelText;
            options.fontname = this.labelFont;
            options.fontcolor = this.labelFontColor;
            options.labelStrokeColor = this.labelStrokeColor;
            options.labelStrokeWidth = this.labelStrokeWidth();
          } else if (this.badgeMode() === 'image' && this.uploadedImageSrc()) {
            options.image = this.hiddenImageBuffer.nativeElement;
          }
        }

        const svgString = qrGen.toSVGString(options);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        this.triggerDownload(url, filename);
        URL.revokeObjectURL(url);
        this.showToast('QR Code SVG exportado com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      this.showToast('Erro ao exportar SVG: ' + err.message, 'error');
    }
  }

  // Copia os dados brutos ou a imagem (em base64) para a área de transferência
  public copyToClipboard(): void {
    const text = this.getQRText();
    navigator.clipboard.writeText(text).then(
      () => {
        this.showToast('Conteúdo do QR Code copiado com sucesso!', 'success');
      },
      (err) => {
        this.showToast('Falha ao copiar dados: ' + err, 'error');
      }
    );
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private convertSvgToCanvasAndDownload(svgEl: SVGElement, filename: string): void {
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgSize = this.size();

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgSize;
      canvas.height = svgSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        this.triggerDownload(url, filename);
        this.showToast('QR Code PNG baixado do SVG com sucesso!', 'success');
      }
    };
  }

  // Gerenciador de Avisos Toasts
  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const id = ++this.toastIdCounter;
    const toast: ToastMessage = { id, message, type, isLeaving: false };
    this.toasts.update(current => [...current, toast]);

    // Inicia a animação de saída após 3.2 segundos
    setTimeout(() => {
      this.toasts.update(current => 
        current.map(t => t.id === id ? { ...t, isLeaving: true } : t)
      );

      // Remove definitivamente do DOM após 400ms (tempo da animação CSS)
      setTimeout(() => {
        this.toasts.update(current => current.filter(t => t.id !== id));
      }, 400);
    }, 3200);
  }

  // Animação GSAP de carregamento da página
  private animateEntrance(): void {
    // Reveal Header
    gsap.from('.main-header', {
      y: -50,
      opacity: 0,
      duration: 1.2,
      ease: 'power4.out'
    });

        // Reveal Left tabs and options
    gsap.from('.tabs-container', {
      x: -30,
      opacity: 0,
      duration: 1,
      delay: 0.2,
      ease: 'power3.out'
    });

    // Reveal Right Preview
    gsap.from('.preview-panel', {
      scale: 0.95,
      opacity: 0,
      duration: 1.2,
      delay: 0.3,
      ease: 'power3.out'
    });
  }

  // Efeito magnético de micro-interação no botão de download
  private setupMagneticButton(): void {
    const btn = this.downloadBtn?.nativeElement;
    if (!btn) return;

    btn.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      gsap.to(btn, {
        x: x * 0.25,
        y: y * 0.25,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)'
      });
    });
  }

  // Alternar entre Tema Claro e Tema Escuro
  public toggleTheme(): void {
    const nextMode = !this.isDarkMode();
    this.isDarkMode.set(nextMode);
    
    if (nextMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
    this.saveCurrentState();
  }

  // Alterar a cor de destaque (Accent Color) do site
  public changeAccentColor(color: string): void {
    if (!color || !color.startsWith('#')) return;
    this.accentColor.set(color);

    // Atualiza as propriedades CSS customizadas globalmente
    document.documentElement.style.setProperty('--accent-primary', color);
    
    const glow = this.hexToRgbGlow(color, 0.35);
    document.documentElement.style.setProperty('--accent-primary-glow', glow);
    
    // Atualiza as cores do canvas 3D
    this.background3D.updateColors(color);

    // Atualiza o favicon dinâmico
    this.updateFavicon();
    this.saveCurrentState();
  }

  // Cria um favicon dinâmico em formato de QR Code combinando com a cor de destaque ativa
  public updateFavicon(): void {
    try {
      // Cria um QR Code em canvas de 64x64 contendo a URL atual
      const canvasEl = qrGen({
        text: window.location.href || 'https://qr-gen.local',
        size: 64,
        rounded: 0,
        quiet: 1,
        fill: this.accentColor(),
        back: '#ffffff', // Fundo branco sólido para legibilidade do ícone
        render: 'canvas'
      }) as HTMLCanvasElement;
      
      const dataUrl = canvasEl.toDataURL('image/png');
      
      // Encontra a tag link rel icon e atualiza seu href
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = dataUrl;
    } catch (err) {
      console.warn('Erro ao atualizar favicon:', err);
    }
  }

  // Salva o estado atual completo no Storage
  public saveCurrentState(): void {
    const state = {
      selectedTab: this.selectedTab(),
      activeAccordion: this.activeAccordion(),
      isDarkMode: this.isDarkMode(),
      accentColor: this.accentColor(),
      
      // Dados dos formulários
      urlData: this.urlData,
      textData: this.textData,
      wifiData: this.wifiData,
      whatsappData: this.whatsappData,
      emailData: this.emailData,
      phoneData: this.phoneData,
      pixData: this.pixData,
      contactData: this.contactData,
      
      // Parâmetros QR Code
      size: this.size(),
      rounded: this.rounded(),
      quiet: this.quiet(),
      ecLevel: this.ecLevel(),
      crisp: this.crisp(),
      renderMode: this.renderMode(),
      
      // Cores QR Code
      fillMode: this.fillMode(),
      solidColor: this.solidColor(),
      bgColor: this.bgColor(),
      transparentBg: this.transparentBg(),
      gradientType: this.gradientType(),
      gradientColor1: this.gradientColor1(),
      gradientColor2: this.gradientColor2(),
      gradientAngle: this.gradientAngle(),
      
      // Finders
      finderShape: this.finderShape(),
      finderEyeShape: this.finderEyeShape(),
      customFinderColor: this.customFinderColor(),
      finderColorMode: this.finderColorMode(),
      finderSolidColor: this.finderSolidColor(),
      finderGradientType: this.finderGradientType(),
      finderGradientColor1: this.finderGradientColor1(),
      finderGradientColor2: this.finderGradientColor2(),
      finderGradientAngle: this.finderGradientAngle(),
      
      // Badge / Contorno
      badgeMode: this.badgeMode(),
      badgeSize: this.badgeSize(),
      labelText: this.labelText,
      labelFont: this.labelFont,
      labelFontColor: this.labelFontColor,
      labelStrokeColor: this.labelStrokeColor,
      labelStrokeWidth: this.labelStrokeWidth()
    };
    this.storage.saveState(state);
  }

  // Carrega o estado salvo no Storage
  private loadSavedState(): void {
    const state = this.storage.loadState();
    if (!state) return;

    try {
      if (state.selectedTab) this.selectedTab.set(state.selectedTab);
      if (state.activeAccordion) this.activeAccordion.set(state.activeAccordion);
      if (state.isDarkMode !== undefined) {
        this.isDarkMode.set(state.isDarkMode);
        if (state.isDarkMode) {
          document.body.classList.remove('light-theme');
        } else {
          document.body.classList.add('light-theme');
        }
      }
      if (state.accentColor) {
        this.accentColor.set(state.accentColor);
        document.documentElement.style.setProperty('--accent-primary', state.accentColor);
        const glow = this.hexToRgbGlow(state.accentColor, 0.35);
        document.documentElement.style.setProperty('--accent-primary-glow', glow);
      }

      // Restaura os dados dos campos preenchidos
      if (state.urlData) Object.assign(this.urlData, state.urlData);
      if (state.textData) Object.assign(this.textData, state.textData);
      if (state.wifiData) Object.assign(this.wifiData, state.wifiData);
      if (state.whatsappData) Object.assign(this.whatsappData, state.whatsappData);
      if (state.emailData) Object.assign(this.emailData, state.emailData);
      if (state.phoneData) Object.assign(this.phoneData, state.phoneData);
      if (state.pixData) Object.assign(this.pixData, state.pixData);
      if (state.contactData) Object.assign(this.contactData, state.contactData);

      // Restaura parâmetros do QR Code
      if (state.size !== undefined) this.size.set(state.size);
      if (state.rounded !== undefined) this.rounded.set(state.rounded);
      if (state.quiet !== undefined) this.quiet.set(state.quiet);
      if (state.ecLevel !== undefined) this.ecLevel.set(state.ecLevel);
      if (state.crisp !== undefined) this.crisp.set(state.crisp);
      if (state.renderMode !== undefined) this.renderMode.set(state.renderMode);

      // Restaura cores do QR Code
      if (state.fillMode !== undefined) this.fillMode.set(state.fillMode);
      if (state.solidColor !== undefined) this.solidColor.set(state.solidColor);
      if (state.bgColor !== undefined) this.bgColor.set(state.bgColor);
      if (state.transparentBg !== undefined) this.transparentBg.set(state.transparentBg);
      if (state.gradientType !== undefined) this.gradientType.set(state.gradientType);
      if (state.gradientColor1 !== undefined) this.gradientColor1.set(state.gradientColor1);
      if (state.gradientColor2 !== undefined) this.gradientColor2.set(state.gradientColor2);
      if (state.gradientAngle !== undefined) this.gradientAngle.set(state.gradientAngle);

      // Restaura Marcadores
      if (state.finderShape !== undefined) this.finderShape.set(state.finderShape);
      if (state.finderEyeShape !== undefined) this.finderEyeShape.set(state.finderEyeShape);
      if (state.customFinderColor !== undefined) this.customFinderColor.set(state.customFinderColor);
      if (state.finderColorMode !== undefined) this.finderColorMode.set(state.finderColorMode);
      if (state.finderSolidColor !== undefined) this.finderSolidColor.set(state.finderSolidColor);
      if (state.finderGradientType !== undefined) this.finderGradientType.set(state.finderGradientType);
      if (state.finderGradientColor1 !== undefined) this.finderGradientColor1.set(state.finderGradientColor1);
      if (state.finderGradientColor2 !== undefined) this.finderGradientColor2.set(state.finderGradientColor2);
      if (state.finderGradientAngle !== undefined) this.finderGradientAngle.set(state.finderGradientAngle);

      // Restaura Badge
      if (state.badgeMode !== undefined) this.badgeMode.set(state.badgeMode);
      if (state.badgeSize !== undefined) this.badgeSize.set(state.badgeSize);
      if (state.labelText !== undefined) this.labelText = state.labelText;
      if (state.labelFont !== undefined) this.labelFont = state.labelFont;
      if (state.labelFontColor !== undefined) this.labelFontColor = state.labelFontColor;
      if (state.labelStrokeColor !== undefined) this.labelStrokeColor = state.labelStrokeColor;
      if (state.labelStrokeWidth !== undefined) this.labelStrokeWidth.set(state.labelStrokeWidth);
    } catch (err) {
      console.warn('Erro ao carregar estado do LocalStorage:', err);
    }
  }

  // Reseta todas as configurações da aplicação para o padrão de fábrica
  public resetToDefaults(): void {
    // Limpa o storage
    this.storage.clearState();

    // Reset Estado UI
    this.selectedTab.set('url');
    this.activeAccordion.set('content');
    
    // Reset Tema
    this.isDarkMode.set(true);
    document.body.classList.remove('light-theme');
    
    // Reset Cor de Destaque
    this.accentColor.set('#4f46e5');
    document.documentElement.style.setProperty('--accent-primary', '#4f46e5');
    document.documentElement.style.setProperty('--accent-primary-glow', 'rgba(79, 70, 229, 0.2)');
    this.background3D.updateColors('#4f46e5');

    // Reset Dados Form
    this.urlData = { url: 'https://brunonyland.com' };
    this.textData = { text: 'Olá do QR-Gen!' };
    this.wifiData = { ssid: 'MinhaRedeWiFi', password: 'SenhaSuperSegura', encryption: 'WPA', hidden: false };
    this.whatsappData = { phone: '5511999999999', message: 'Olá! Vim através do QR Code gerado pelo QR-Gen.' };
    this.emailData = { recipient: 'contato@brunonyland.com', subject: 'Contato Comercial', body: 'Olá Bruno, gostaria de saber mais sobre...' };
    this.phoneData = { phone: '+5511999999999' };
    this.pixData = { key: 'contato@brunonyland.com', name: 'Bruno Nyland', city: 'SAO PAULO', amount: null, txid: 'PEDIDO100' };
    this.contactData = { name: 'Bruno Nyland', phone: '+5511999999999', email: 'contato@brunonyland.com', org: 'BrunoNyland Inc', url: 'https://brunonyland.com' };

    // Reset Parâmetros QR
    this.size.set(400);
    this.rounded.set(0);
    this.quiet.set(1);
    this.ecLevel.set('H');
    this.crisp.set(true);
    this.renderMode.set('canvas');

    // Reset Cores QR
    this.fillMode.set('solid');
    this.solidColor.set('#111111');
    this.bgColor.set('#ffffff');
    this.transparentBg.set(false);
    this.gradientType.set('linear');
    this.gradientColor1.set('#4f46e5');
    this.gradientColor2.set('#8b5cf6');
    this.gradientAngle.set(135);

    // Reset Marcadores QR
    this.finderShape.set(null);
    this.finderEyeShape.set(null);
    this.customFinderColor.set(false);
    this.finderColorMode.set('solid');
    this.finderSolidColor.set('#4f46e5');
    this.finderGradientType.set('linear');
    this.finderGradientColor1.set('#4f46e5');
    this.finderGradientColor2.set('#8b5cf6');
    this.finderGradientAngle.set(135);

    // Reset Sobreposição Central (Badge)
    this.badgeMode.set('plain');
    this.badgeSize.set(20);
    this.labelText = 'QR';
    this.labelFont = 'Outfit';
    this.labelFontColor = '#4f46e5';
    this.labelStrokeColor = '#171719';
    this.labelStrokeWidth.set(0.2);
    this.uploadedImageSrc.set(null);

    // Atualiza Favicon e regenera QR
    this.updateFavicon();
    this.generateQR();

    this.showToast('Configurações redefinidas com sucesso!', 'success');
  }

  // Helper para converter Hex para RGBA para efeito de sombra/brilho
  private hexToRgbGlow(hex: string, alpha: number): string {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(0, 240, 255, ${alpha})`;
  }
}
