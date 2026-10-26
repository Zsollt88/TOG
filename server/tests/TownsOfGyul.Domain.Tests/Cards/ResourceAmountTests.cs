using TownsOfGyul.Domain.Cards;

namespace TownsOfGyul.Domain.Tests.Cards;

public sealed class ResourceAmountTests
{
    [Fact]
    public void None_IsEmpty()
    {
        Assert.True(ResourceAmount.None.IsEmpty);
    }

    [Fact]
    public void SameAmounts_AreEqual()
    {
        ResourceAmount first = new ResourceAmount(Gold: 1, Common: 2);
        ResourceAmount second = new ResourceAmount(Gold: 1, Common: 2);

        Assert.Equal(first, second);
    }

    [Theory]
    [InlineData(-1, 0, 0)]
    [InlineData(0, -1, 0)]
    [InlineData(0, 0, -1)]
    public void NegativeAmount_Throws(int gold, int common, int rare)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new ResourceAmount(gold, common, rare));
    }

    [Theory]
    [InlineData(ResourceKind.Gold, 3, 0, 0)]
    [InlineData(ResourceKind.Common, 0, 3, 0)]
    [InlineData(ResourceKind.Rare, 0, 0, 3)]
    public void Of_FillsOnlyThatKind(ResourceKind kind, int gold, int common, int rare)
    {
        ResourceAmount amount = ResourceAmount.amountBuilderSingleKind(kind, 3);

        Assert.Equal(new ResourceAmount(gold, common, rare), amount);
    }

    [Fact]
    public void Addition_SumsEachResource()
    {
        ResourceAmount first = new ResourceAmount(Gold: 1, Common: 1);
        ResourceAmount second = new ResourceAmount(Gold: 1, Common: 1, Rare: 2);

        ResourceAmount total = first + second;

        Assert.Equal(new ResourceAmount(Gold: 2, Common: 2, Rare: 2), total);
    }
}
