using TownsOfGyul.Domain.Cards;

namespace TownsOfGyul.Domain.Tests.Cards;

public sealed class ProductionTests
{
    // Mirrors an OR-production card: "2 common + 1 gold / 1 rare + 1 gold".
    private static readonly ResourceAmount CommonOption = new ResourceAmount(Gold: 1, Common: 2);
    private static readonly ResourceAmount RareOption = new ResourceAmount(Gold: 1, Rare: 1);

    [Fact]
    public void NoOptions_Throws()
    {
        ResourceAmount[] noOptions = Array.Empty<ResourceAmount>();

        Assert.Throws<ArgumentException>(() => new Production(noOptions));
    }

    [Fact]
    public void Single_IsNotChoice()
    {
        Production production = Production.Single(new ResourceAmount(Common: 1));

        Assert.False(production.IsChoice);
    }

    [Fact]
    public void TwoOptions_IsChoice()
    {
        Production production = new Production(new[] { CommonOption, RareOption });

        Assert.True(production.IsChoice);
    }

    [Fact]
    public void Choose_ReturnsPickedOption()
    {
        Production production = new Production(new[] { CommonOption, RareOption });

        ResourceAmount picked = production.Choose(1);

        Assert.Equal(RareOption, picked);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(2)]
    public void Choose_OutOfRange_Throws(int optionIndex)
    {
        Production production = new Production(new[] { CommonOption, RareOption });

        Assert.Throws<ArgumentOutOfRangeException>(() => production.Choose(optionIndex));
    }

    [Fact]
    public void SameOptions_AreEqual()
    {
        Production first = new Production(new[] { CommonOption, RareOption });
        Production second = new Production(new[] { CommonOption, RareOption });

        Assert.Equal(first, second);
        Assert.Equal(first.GetHashCode(), second.GetHashCode());
    }

    [Fact]
    public void Options_AreCopiedFromInput()
    {
        ResourceAmount[] input = new[] { CommonOption, RareOption };
        Production production = new Production(input);

        input[0] = RareOption;

        Assert.Equal(CommonOption, production.Options[0]);
    }
}
