using TownsOfGyul.Domain.Cards;

namespace TownsOfGyul.Domain.Tests.Cards;

public sealed class CardCostTests
{
    [Fact]
    public void None_IsFree()
    {
        Assert.True(CardCost.None.IsFree);
    }

    [Fact]
    public void VariableX_IsNotFree()
    {
        CardCost cost = new CardCost(ResourceAmount.None, ResourceKind.Common);

        Assert.False(cost.IsFree);
    }

    [Fact]
    public void FixedOnly_HasNoVariableX()
    {
        CardCost cost = new CardCost(new ResourceAmount(Rare: 2));

        Assert.False(cost.HasVariableX);
    }

    [Fact]
    public void SameXInDifferentKinds_AreNotEqual()
    {
        CardCost commonX = new CardCost(ResourceAmount.None, ResourceKind.Common);
        CardCost goldX = new CardCost(ResourceAmount.None, ResourceKind.Gold);

        Assert.NotEqual(commonX, goldX);
    }

    [Fact]
    public void NullFixed_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new CardCost(null!));
    }

    [Fact]
    public void Resolve_AddsXToVariableResource()
    {
        CardCost cost = new CardCost(new ResourceAmount(Gold: 1), ResourceKind.Common);

        ResourceAmount payment = cost.Resolve(3);

        Assert.Equal(new ResourceAmount(Gold: 1, Common: 3), payment);
    }

    [Fact]
    public void Resolve_NegativeX_Throws()
    {
        CardCost cost = new CardCost(ResourceAmount.None, ResourceKind.Common);

        Assert.Throws<ArgumentOutOfRangeException>(() => cost.Resolve(-1));
    }

    [Fact]
    public void Resolve_NonZeroXWithoutVariable_Throws()
    {
        CardCost cost = new CardCost(new ResourceAmount(Rare: 2));

        Assert.Throws<ArgumentException>(() => cost.Resolve(2));
    }

    [Fact]
    public void Resolve_ZeroX_ReturnsFixedPart()
    {
        CardCost cost = new CardCost(new ResourceAmount(Gold: 1), ResourceKind.Common);

        ResourceAmount payment = cost.Resolve(0);

        Assert.Equal(new ResourceAmount(Gold: 1), payment);
    }

    [Fact]
    public void Resolve_NoneWithZeroX_ReturnsNone()
    {
        ResourceAmount payment = CardCost.None.Resolve(0);

        Assert.Equal(ResourceAmount.None, payment);
    }
}
