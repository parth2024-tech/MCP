# Yann Lecun Tecnico — Code Reference

## ## I-Jepa: Pseudocódigo Pytorch Completo

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import copy

class IJEPA(nn.Module):
    """
    I-JEPA: Image Joint Embedding Predictive Architecture
    Assran et al. 2023 — CVPR
    """
    def __init__(self, encoder, predictor, momentum=0.996):
        super().__init__()
        self.context_encoder = encoder
        self.target_encoder = copy.deepcopy(encoder)
        self.predictor = predictor
        self.momentum = momentum

        for param in self.target_encoder.parameters():
            param.requires_grad = False

    @torch.no_grad()
    def update_target_encoder(self):
        """EMA update"""
        for param_ctx, param_tgt in zip(
            self.context_encoder.parameters(),
            self.target_encoder.parameters()
        ):
            param_tgt.data = (
                self.momentum * param_tgt.data +
                (1 - self.momentum) * param_ctx.data
            )

    def forward(self, images):
        context_patches, target_patches, masks = self.create_masks(images)
        context_embeds = self.context_encoder(context_patches, masks)

        with torch.no_grad():
            target_embeds = self.target_encoder(target_patches)

        predicted_embeds = self.predictor(context_embeds, target_positions)
        loss = F.mse_loss(predicted_embeds, target_embeds.detach())
        return loss

    def create_masks(self, images, num_target_blocks=4, context_scale=0.85):
        """
        Estratégia I-JEPA:
        - Múltiplos blocos alvo aleatórios (alto aspect ratio)
        - Contexto: imagem com blocos alvo mascarados
        """
        B, C, H, W = images.shape
        patch_size = 16
        n_patches_h = H // patch_size
        n_patches_w = W // patch_size

        target_masks = generate_random_blocks(
            n_patches_h, n_patches_w,
            num_blocks=num_target_blocks,
            scale_range=(0.15, 0.2),
            aspect_ratio_range=(0.75, 1.5)
        )
        context_mask = ~targe

## V-Jepa: Extensão Temporal

```python


## ## Os 6 Módulos Do Ami

```
+----------------------------------------------------------+
|                 SISTEMA AMI COMPLETO                      |
|                                                          |
|  +-----------+    +------------------+                  |
|  | Perceptor |    | World Model      |                  |
|  | (encoders)|    | (JEPA hierárquico)|                 |
|  +-----------+    +------------------+                  |
|        |                  |                             |
|        v                  v                             |
|  +----------+    +------------------+                   |
|  | Memory   |<-->| Cost Module      |                   |
|  | (epis,   |    | (intrínseco +    |                   |
|  |  semant) |    |  configurável)   |                   |
|  +----------+    +------------------+                   |
|                           |                             |
|                  +------------------+                   |
|                  | Actor (planner   |                   |
|                  | + executor)      |                   |
|                  +------------------+                   |
+----------------------------------------------------------+
```


## ## Task_Cost: Objetivo Configurável Por Tarefa/Humano

```

**Módulo 5 — Short-term Memory**: Buffer de estados, simulações, contexto imediato.

**Módulo 6 — Actor**:
- Modo reativo: ações diretas do estado atual
- Modo deliberativo: simula múltiplos futuros, escolhe mínimo custo

## Ami Vs Llms

| Feature | LLM | AMI |
|---------|-----|-----|
| Objetivo | Prever próximo token | Minimizar erro em representação |
| World model | Nenhum | Módulo dedicado central |
| Planning | Texto sobre planning | Planning real com simulação |
| Memória | Context window (fixo) | Memória episódica atualizável |
| Objetivos | Apenas treinamento | Cost module configurável |
| Input | Texto | Multi-modal (video, audio, propriocepção) |
| Causalidade | Correlacional | Causal (dinâmicas do mundo) |

---

## Seção Ebm — Energy-Based Models

Contribuição subestimada que vai ser mais influente a longo prazo.

**O problema com probabilísticos**:
```


```python
class EnergyBasedModel(nn.Module):
    """
    EBM: F(x) = energia de x
    P(x) ~ exp(-F(x)) / Z  — mas nunca calculamos Z!
    Vantagem: sem partition function intratável.
    """
    def __init__(self, latent_dim=512):
        super().__init__()
        self.energy_net = nn.Sequential(
            nn.Linear(latent_dim, 256),
            nn.SiLU(),
            nn.Linear(256, 128),
            nn.SiLU(),
            nn.Linear(128, 1)  # escalar: energia
        )

    def energy(self, x):
        return self.energy_net(x).squeeze(-1)

    def contrastive_loss(self, x_pos, x_neg):
        """
        L = E[F(x_pos)] - E[F(x_neg)] + regularização
        Queremos: E_pos < E_neg
        """
        E_pos = self.energy(x_pos)
        E_neg = self.energy(x_neg)
        loss = E_pos.mean() - E_neg.mean()
        reg = 0.1 * (E_pos.pow(2).mean() + E_neg.pow(2).mean())
        return loss + reg

## Ebms Capturam Isso Naturalmente — São Sobre Compatibilidade, Não Probabilidade."

```


## ## Simclr Simplificado

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T


class ProjectionHead(nn.Module):
    """MLP que projeta representações para espaço contrastivo"""
    def __init__(self, in_dim=512, hidden_dim=256, out_dim=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim, out_dim)
        )

    def forward(self, x):
        return F.normalize(self.net(x), dim=-1)


class SimCLRLoss(nn.Module):
    """NT-Xent Loss (Chen et al. 2020)"""
    def __init__(self, temperature=0.5):
        super().__init__()
        self.temp = temperature

    def forward(self, z1, z2):
        """
        z1, z2: [B, D] — duas views do mesmo batch
        z1[i] e z2[i]: positive pair
        Todos outros pares: negatives
        """
        B = z1.size(0)
        z = torch.cat([z1, z2], dim=0)
        sim = torch.mm(z, z.t()) / self.temp
        mask = torch.eye(2*B, device=z.device).bool()
        sim.masked_fill_(mask, float('-inf'))
        labels = torch.arange(B, device=z.device)
        labels = torch.cat([labels + B, labels])
        return F.cross_entropy(sim, labels)


def get_ssl_augmentations(size=224):
    """
    As augmentações DEFINEM o que o modelo aprende a ser invariante.
    Rotação -> invariância a rotação.
    Crop -> invariância a posição.
    """
    return T.Compose([
        T.RandomResizedCrop(size, scale=(0.2, 1.0)),
        T.RandomHorizontalFlip(),
        T.ColorJitter(brightness=0.4, contrast=0.4, saturation=0.4, hue=0.1),
        T.RandomGrayscale(p=0.2),
        T.GaussianBlur(kernel_size=size//10*2+1, sigma=(0.1, 2.0)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
```


## ## Lenet-5 Original Em Pytorch Moderno

```python
class LeNet5Modern(nn.Module):
    """
    LeNet-5 (LeCun et al. 1998) reimplementada em PyTorch moderno.
    Esta arquitetura rodou em produção no Bank of America em 1993.
    ~60,000 parâmetros. Mesmos princípios de modelos modernos com bilhões.
    """
    def __init__(self, num_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 6, kernel_size=5, padding=2),
            nn.Tanh(),
            nn.AvgPool2d(kernel_size=2, stride=2),
            nn.Conv2d(6, 16, kernel_size=5),
            nn.Tanh(),
            nn.AvgPool2d(kernel_size=2, stride=2),
            nn.Conv2d(16, 120, kernel_size=5),
            nn.Tanh(),
        )
        self.classifier = nn.Sequential(
            nn.Linear(120, 84),
            nn.Tanh(),
            nn.Linear(84, num_classes),
        )

    def forward(self, x):
        x = self.features(x)    # [B, 120, 1, 1]
        x = x.view(x.size(0), -1)
        return self.classifier(x)
```


